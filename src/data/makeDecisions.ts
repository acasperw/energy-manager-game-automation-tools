import { GameSessionData, TaskDecisions } from "../types/interface";
import { CO2_PRICE_THRESHOLD_MAX, HYDROGEN_PRICE_THRESHOLD_MIN, OIL_PRICE_THRESHOLD_MAX, STORAGE_CHARGE_THRESHOLD_MIN, URANIUM_PRICE_THRESHOLD_MAX } from "../config";
import { filterGridsByStorageType, isGridChargeAboveThreshold } from "../utils/grid-utils";

export function makeDecisions(data: GameSessionData): TaskDecisions {
  let enableStoragesPlants = false;
  let sellHydrogen = false;
  let sellEnergy = false;
  let buyCo2Quotas = false;
  let reenableSolarPlants = false;
  let buyOil = false;
  let buyUranium = false;

  // Power grids (excluding p2x storages)
  const nonP2xGrids = filterGridsByStorageType(data.energyGrids, 'non-p2x');
  if (nonP2xGrids.some(grid => isGridChargeAboveThreshold(grid, 'non-p2x', STORAGE_CHARGE_THRESHOLD_MIN))) {
    sellEnergy = true;
  }

  // Hydrogen grids
  if (data.hydrogenValue >= HYDROGEN_PRICE_THRESHOLD_MIN) {
    const p2xGrids = filterGridsByStorageType(data.energyGrids, 'p2x');
    if (p2xGrids.some(grid => isGridChargeAboveThreshold(grid, 'p2x', STORAGE_CHARGE_THRESHOLD_MIN))) {
      sellHydrogen = true;
    }
  }

  // Storage & Plants
  if (data.plants.some(plant => plant.online === 0)) {
    enableStoragesPlants = true;
  }

  // Solar plants
  const solarPlantsToReenable: string[] = [];
  const discrepancyThreshold = 0.25;
  for (const grid of data.energyGrids) {
    for (const storage of grid.storages) {
      if (storage.plantsConnected > 0) {
        const expectedCharge = storage.expectedChargePerSec;
        const actualCharge = storage.chargePerSec;
        if (expectedCharge > 0 && actualCharge / expectedCharge < (1 - discrepancyThreshold)) {
          reenableSolarPlants = true;
          const affectedPlantIds = data.plants
            .filter(plant => plant.storageId.toString() === storage.id && plant.plantType === 'solar')
            .map(plant => plant.plantId);
          solarPlantsToReenable.push(...affectedPlantIds);
        }
      }
    }
  }

  // Co2
  if (data.co2Value < CO2_PRICE_THRESHOLD_MAX && data.emissionPerKwh > 1) {
    buyCo2Quotas = true;
  }

  // Oil
  if (data.oilBuyPrice < OIL_PRICE_THRESHOLD_MAX) {
    buyOil = true;
  }

  // Uranium
  if (data.uraniumPrice < URANIUM_PRICE_THRESHOLD_MAX) {
    buyUranium = true;
  }

  return {
    sellEnergy,
    sellHydrogen,
    enableStoragesPlants,
    reenableSolarPlants,
    solarPlantsToReenable,
    buyCo2Quotas,
    buyOil,
    buyUranium,
  };
}
