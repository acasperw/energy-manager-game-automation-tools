import { Page } from "puppeteer";
import { GameSessionData, StorageAndPlantManagementResult, TaskDecisions } from "../types/interface";
import { Plant } from "../types/api";
import { postApiData } from "../utils/api-requests";
import { getSliderValuesFromString } from "../utils/browser-data-helpers";
import { capitalize } from "../utils/helpers";

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
    await refuelPlants(page, data, result);
    await disableFuelPlantsWithFullStorages(page, data, result);
    await enableOfflinePlants(page, data, result);
    await switchFuelPlantsWithFullStorages(page, data, result);
    await reEnableSolarPlants(page, data, decisions, result);
  } catch (error) {
    console.error('Error in storageAndPlantManagement:', error);
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
      await postApiData(page, `/fuel-management.php?mode=do&pct=${value}&type=${fuelType}`);
      result.refueled[`didRefuel${capitalize(plantType)}` as 'didRefuelOil' | 'didRefuelNuclear' | 'didRefuelCoal'] = true;
      result.refueled[`pctRefueled${capitalize(plantType)}` as 'pctRefueledOil' | 'pctRefueledNuclear' | 'pctRefueledCoal'] = value!;
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
  console.log('onlineFuelPlants:', onlineFuelPlants);
}

async function reEnableSolarPlants(page: Page, data: GameSessionData, decisions: TaskDecisions, result: StorageAndPlantManagementResult): Promise<void> {
  // Implement logic to re-enable solar plants
  // Exclude plants that have been previously interacted with
}

// Helper functions (to be implemented)
function findStorageById(data: GameSessionData, storageId: number): Storage | undefined {
  // Implement logic to find storage by ID
  return undefined;
}

function isStorageFull(storage: Storage): boolean {
  // Implement logic to check if storage is full
  return false;
}

function findAvailableStorage(data: GameSessionData, plant: Plant): Storage | undefined {
  // Implement logic to find an available storage for the plant
  return undefined;
}

async function switchPlantStorage(page: Page, plant: Plant, newStorage: Storage): Promise<void> {
  // Implement logic to switch plant to new storage
}
