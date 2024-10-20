import { Page } from "puppeteer";
import { GameSessionData, StorageAndPlantManagementResult, TaskDecisions } from "../types/interface";
import { ConnectionInfo, Plant, StorageConnectionInfo } from "../types/api";
import { fetchApiData, postApiData } from "../utils/api-requests";
import { getSliderValuesFromString } from "../utils/browser-data-helpers";
import { capitalize } from "../utils/helpers";
import { findStorageById, isStorageFull } from "../utils/grid-utils";
import { calculateDistance } from "./vessels/vessel-helpers";

interface NewStorageConnection {
  id: number;
  capacity: number;
  lat: number;
  lon: number;
}

const FUEL_BASED_PLANTS = ['fossil', 'nuclear', 'coal'];
const FUEL_TYPE_MAP = {
  'fossil': 'oil',
  'nuclear': 'uranium',
  'coal': 'coal'
};

export async function storageAndPlantManagement(page: Page, data: GameSessionData, decisions: TaskDecisions): Promise<StorageAndPlantManagementResult> {

  const result: StorageAndPlantManagementResult = {
    totalEnabled: 0,
    totalDisabled: 0,
    totalSkipped: 0,
    totalSwitched: 0,
    totalErrors: 0,
    refueled: {
      totalOutOfFuel: 0,
      didRefuelOil: false,
      pctRefueledOil: 0,
      didRefuelNuclear: false,
      pctRefueledNuclear: 0,
      didRefuelCoal: false,
      pctRefueledCoal: 0
    },
    reEnabledSolarPlants: {
      enabledPlants: 0,
    },
    kwEnergyBefore: 0,
    kwEnergyAfter: 0
  };

  try {
    // result.kwEnergyBefore = await getEnergyOutputAmount(page) ?? 0;
    await disableFuelPlantsWithFullStorages(page, data, result);
    await refuelPlants(page, data, result);
    await switchFuelPlantsWithFullStorages(page, data, result);
    await enableOfflinePlants(page, data, result);
    // await reEnableSolarPlants(page, data, decisions, result);
    // result.kwEnergyAfter = await getEnergyOutputAmount(page) ?? 0;
  } catch (error) {
    console.error('Error in storageAndPlantManagement:', error);
    result.totalErrors++;
  }

  return result;
}

async function refuelPlants(page: Page, data: GameSessionData, result: StorageAndPlantManagementResult): Promise<void> {
  const offlineFuelPlants = data.plants.filter(plant => FUEL_BASED_PLANTS.includes(plant.plantType) && !plant.online);
  for (const fuelType of FUEL_BASED_PLANTS) {
    const plantsOfType = offlineFuelPlants.filter(plant => plant.plantType === fuelType);
    if (plantsOfType.length > 0) {
      await refuelPlantType(page, fuelType, result);
    }
  }
}

async function refuelPlantType(page: Page, plantType: string, result: StorageAndPlantManagementResult): Promise<void> {
  const fuelType = FUEL_TYPE_MAP[plantType as keyof typeof FUEL_TYPE_MAP];

  try {
    const checkResponse: string = await postApiData(page, `/fuel-management.php?type=${fuelType}`);
    const { value, max } = getSliderValuesFromString(checkResponse);

    if (max > 0 && value! < max) {
      await postApiData(page, `/fuel-management.php?mode=do&pct=${max}&type=${fuelType}`);
      result.refueled[`didRefuel${capitalize(plantType)}` as 'didRefuelOil' | 'didRefuelNuclear' | 'didRefuelCoal'] = true;
      result.refueled[`pctRefueled${capitalize(plantType)}` as 'pctRefueledOil' | 'pctRefueledNuclear' | 'pctRefueledCoal'] = max;
    }
  } catch (error) {
    console.error(`Error refueling ${plantType} plants:`, error);
    result.refueled.totalOutOfFuel += 1;
  }
}

async function switchFuelPlantsWithFullStorages(page: Page, data: GameSessionData, result: StorageAndPlantManagementResult): Promise<void> {
  const fuelPlantsWithFullStorages = data.plants.filter(plant =>
    FUEL_BASED_PLANTS.includes(plant.plantType) &&
    isStorageFull(findStorageById(plant.storageId, data.energyGrids))
  );

  const switchedStorages = new Set<string>();

  for (const plant of fuelPlantsWithFullStorages) {
    try {
      const html = await postApiData<string>(page, `/status-plant-fossil.php?id=${plant.plantId}`);
      const connectionInfo = parseConnectionInfo(html);

      if (!connectionInfo) {
        console.warn(`Could not parse connection info for plant ${plant.plantId}`);
        continue;
      }

      const newStorage = await findBestAvailableStorage(page, data, connectionInfo, switchedStorages);

      if (newStorage) {
        try {
          await postApiData(page, `/connect-storage.php?plantId=${plant.plantId}&storageId=${newStorage.id}`);
          plant.storageId = newStorage.id;
          result.totalSwitched++;
          switchedStorages.add(newStorage.id.toString());
          // Update the plantsConnected count for existing storage
          const updatedStorage = findStorageById(newStorage.id, data.energyGrids);
          updatedStorage.plantsConnected++;
        } catch (error) {
          console.error(`Error switching storage for plant ${plant.plantId}:`, error);
          result.totalErrors++;
        }
      }
    } catch (error) {
      console.error(`Error switching storage for plant ${plant.plantId}:`, error);
      result.totalErrors++;
    }
  }
}

function parseConnectionInfo(html: string): ConnectionInfo | null {
  const regex = /startStorageConnection\((\d+),([\d.]+),([\d.]+),(\d+),(\d+),(\d+)\)/;
  const match = html.match(regex);

  if (match) {
    return {
      plantId: parseInt(match[1]),
      lat: parseFloat(match[2]),
      lon: parseFloat(match[3]),
      distance: parseInt(match[4]),
      currentStorageId: parseInt(match[5]),
      landId: parseInt(match[6])
    };
  }

  return null;
}

async function findBestAvailableStorage(page: Page, data: GameSessionData, connectionInfo: ConnectionInfo, switchedStorages: Set<string>): Promise<NewStorageConnection | null> {
  const MIN_STORAGE_CAPACITY = 1000000;

  const eligibleStorages = data.energyGrids
    .flatMap(grid => grid.storages)
    .filter(storage =>
      storage.id !== connectionInfo.currentStorageId.toString() &&
      storage.capacity >= MIN_STORAGE_CAPACITY &&
      !isStorageFull(storage) &&
      calculateDistance(connectionInfo.lat, connectionInfo.lon, storage.lat, storage.lon, 'km') <= connectionInfo.distance &&
      !switchedStorages.has(storage.id)
    )
    .sort((a, b) => {
      if (a.plantsConnected === 0 && b.plantsConnected > 0) return -1;
      if (b.plantsConnected === 0 && a.plantsConnected > 0) return 1;
      // If both have connections or both don't, sort by capacity
      return b.capacity - a.capacity;
    });

  for (const storage of eligibleStorages) {
    const apiResponse = await fetchApiData<StorageConnectionInfo>(page, `/api/storage.php?id=${storage.id}&plantLat=${connectionInfo.lat}&landId=${connectionInfo.landId}&plantLon=${connectionInfo.lon}&plantId=${connectionInfo.plantId}`);

    if (apiResponse.plantsConnected < apiResponse.maxConnections) {
      return {
        id: parseInt(storage.id),
        capacity: storage.capacity,
        lat: apiResponse.lat,
        lon: apiResponse.lon
      };
    }
  }
  return null;
}

async function enableOfflinePlants(page: Page, data: GameSessionData, result: StorageAndPlantManagementResult): Promise<void> {
  const offlinePlants = data.plants.filter(plant => !plant.online);

  for (const plant of offlinePlants) {
    try {
      const storage = findStorageById(plant.storageId, data.energyGrids);

      if (!storage || storage.discharging || isStorageFull(storage) ||
        (FUEL_BASED_PLANTS.includes(plant.plantType) && plant.fuelHolding <= 0)) {
        result.totalSkipped++;
        continue;
      }

      const endpoint = FUEL_BASED_PLANTS.includes(plant.plantType)
        ? `/status-plant-set-fossil.php?id=${plant.plantId}&paneTarget=max`
        : `/status-plant-set.php?id=${plant.plantId}`;

      await postApiData(page, endpoint);

      result.totalEnabled++;
      updatePlantStatus(data, plant.plantId, true);
    } catch (error) {
      console.error(`Error enabling plant ${plant.plantId}:`, error);
      result.totalErrors++;
    }
  }
}

async function disableFuelPlantsWithFullStorages(page: Page, data: GameSessionData, result: StorageAndPlantManagementResult): Promise<void> {
  const onlineFuelPlants: Plant[] = data.plants.filter(plant => plant.online && FUEL_BASED_PLANTS.includes(plant.plantType));
  const disabledPlantIds: string[] = [];
  for (const plant of onlineFuelPlants) {
    const storage = findStorageById(plant.storageId, data.energyGrids);
    if (storage && isStorageFull(storage)) {
      try {
        await postApiData(page, `/status-plant-set-fossil.php?id=${plant.plantId}&target=0`);
        await postApiData(page, `/api/production.stop.php?id=${plant.plantId}`);
        result.totalDisabled += 1;
        disabledPlantIds.push(plant.plantId);
      } catch (error) {
        console.error(`Error disabling plant ${plant.plantType} with full storage:`, error);
        result.totalErrors += 1;
      }
    }
  }
  disabledPlantIds.forEach(plantId => updatePlantStatus(data, plantId, false));
}

async function reEnableSolarPlants(page: Page, data: GameSessionData, decisions: TaskDecisions, result: StorageAndPlantManagementResult): Promise<void> {
  // Implement logic to re-enable solar plants
  // Exclude plants that have been previously interacted with
}

function updatePlantStatus(data: GameSessionData, plantId: string, isOnline: boolean): void {
  const plant = data.plants.find(p => p.plantId === plantId);
  if (plant) {
    plant.online = isOnline ? 1 : 0;
  }
}
