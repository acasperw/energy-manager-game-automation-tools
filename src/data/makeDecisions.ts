import { GameSessionData, TaskDecisions } from "../types/interface";
import { CO2_PRICE_THRESHOLD_MAX, HYDROGEN_PRICE_THRESHOLD_MIN, STORAGE_CHARGE_THRESHOLD_MIN } from "../config";
import { filterGridsByStorageType, isGridChargeAboveThreshold } from "../utils/grid-utils";

export function makeDecisions(data: GameSessionData): TaskDecisions {
  let enableStoragesPlants = false;
  let sellHydrogen = false;
  let sellEnergy = false;
  let buyCo2Quotas = false;

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

  // Co2
  if (data.co2Value < CO2_PRICE_THRESHOLD_MAX && data.emissionPerKwh > 1) {
    buyCo2Quotas = true;
  }

  // Storage & Plants
  if (data.plants.some(plant => plant.online === 0)) {
    enableStoragesPlants = true;
  }

  const reenableSolarPlants = false;

  return {
    sellEnergy,
    sellHydrogen,
    buyCo2Quotas,
    enableStoragesPlants,
    reenableSolarPlants,
  };
}