import { Page } from "puppeteer";
import { GameSessionData, StorageAndPlantManagementResult, TaskDecisions } from "../types/interface";
import { Plant } from "../types/api";
import { postApiData } from "../utils/api-requests";
import { getSliderValuesFromString } from "../utils/browser-data-helpers";
import { capitalize } from "../utils/helpers";
import { findStorageById, isStorageFull } from "../utils/grid-utils";

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
    console.log('offline plants 1', data.plants.filter(plant => !plant.online).length);

    await disableFuelPlantsWithFullStorages(page, data, result);
    console.log('offline plants 2', data.plants.filter(plant => !plant.online).length);

    await refuelPlants(page, data, result);
    await switchFuelPlantsWithFullStorages(page, data, result);
    await enableOfflinePlants(page, data, result);
    console.log('offline plants 3', data.plants.filter(plant => !plant.online).length);

    await reEnableSolarPlants(page, data, decisions, result);
    console.log('offline plants 4', data.plants.filter(plant => !plant.online).length);

  } catch (error) {
    console.error('Error in storageAndPlantManagement:', error);
  }

  console.log('Storage and plant management result:', result);

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
  // Implement switching logic for fuel-based plants with full storages
}

async function enableOfflinePlants(page: Page, data: GameSessionData, result: StorageAndPlantManagementResult): Promise<void> {
  // Implement logic to enable offline plants
}

async function disableFuelPlantsWithFullStorages(page: Page, data: GameSessionData, result: StorageAndPlantManagementResult): Promise<void> {
  const onlineFuelPlants: Plant[] = data.plants.filter(plant => plant.online && FUEL_BASED_PLANTS.includes(plant.plantType));
  const disabledPlantIds: string[] = [];
  for (const plant of onlineFuelPlants) {
    const storage = findStorageById(plant.storageId, data.energyGrids);
    if (storage && isStorageFull(storage)) {
      try {
        await postApiData(page, `/status-plant-set-fossil.php?id=${plant.plantId}&paneTarget=max`);
        await postApiData(page, `/production.stop.php?id=${plant.plantId}`); // Why is this not done by the above call?
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

function findAvailableStorage(data: GameSessionData, plant: Plant): Storage | undefined {
  // Implement logic to find an available storage for the plant
  return undefined;
}

async function switchPlantStorage(page: Page, plant: Plant, newStorage: Storage): Promise<void> {
  // Implement logic to switch plant to new storage
}

function updatePlantStatus(data: GameSessionData, plantId: string, isOnline: boolean): void {
  const plant = data.plants.find(p => p.plantId === plantId);
  if (plant) {
    plant.online = isOnline ? 1 : 0;
    console.log(`Plant ${plant.plantId} is now ${isOnline ? 'online' : 'offline'}`);
  }
}
