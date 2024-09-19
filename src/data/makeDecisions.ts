import { GameSessionData, TaskDecisions } from "../types/interface";
import { CO2_PRICE_THRESHOLD_MAX, HYDROGEN_PRICE_THRESHOLD_MIN, STORAGE_CHARGE_THRESHOLD_MIN } from "../config";

export function makeDecisions(data: GameSessionData): TaskDecisions {

  let enableStoragesPlants = false;
  let sellHydrogen = false;
  let sellEnergy = false;
  let buyCo2Quotas = false;

  // Energy
  if (data.energyGrids.some(grid => grid.chargePercentage > STORAGE_CHARGE_THRESHOLD_MIN)) {
    sellEnergy = true;
  }

  // Hydrogen
  if (data.hydrogenValue >= HYDROGEN_PRICE_THRESHOLD_MIN) {
    const hydrogenStorage = data.energyGrids.find(grid => grid.storages.some(storage => storage.type === 'p2x'));
    if (hydrogenStorage && hydrogenStorage.chargePercentage > STORAGE_CHARGE_THRESHOLD_MIN) {
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
