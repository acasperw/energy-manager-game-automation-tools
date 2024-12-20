import { GameSessionData, TaskDecisions, VesselStatus } from "../types/interface";
import { CO2_PRICE_THRESHOLD_MAX, COAL_PRICE_THRESHOLD_MAX, HYDROGEN_PRICE_THRESHOLD_MIN, HYDROGEN_SUPER_PRICE_THRESHOLD_MIN, OIL_PRICE_THRESHOLD_MAX, RESEARCH_BUDGET_PERCENTAGE, STORAGE_CHARGE_THRESHOLD_MIN, URANIUM_PRICE_THRESHOLD_MAX } from "../config";
import { filterGridsByStorageType, isGridChargeAboveThreshold } from "../utils/grid-utils";

export function makeDecisions(data: GameSessionData): TaskDecisions {
  let sellHydrogen = false;
  let sellHydrogenSilo = false;
  let sellEnergy = false;

  let manageStoragesPlants = false;

  let buyCo2Quotas = false;
  let buyCommodities = false;

  let storeHydrogen = false;

  let doResearch = false;

  let vesselRequireAttention = false;

  // Power grids (excluding p2x storages)
  const nonP2xGrids = filterGridsByStorageType(data.energyGrids, 'non-p2x');
  if (nonP2xGrids.some(grid => isGridChargeAboveThreshold(grid, 'non-p2x', STORAGE_CHARGE_THRESHOLD_MIN))) {
    sellEnergy = true;
  }

  // Hydrogen grids
  if (data.hydrogen.hydrogenPricePerKg >= HYDROGEN_PRICE_THRESHOLD_MIN || data.hydrogen.hydrogenPricePerKg >= HYDROGEN_SUPER_PRICE_THRESHOLD_MIN) {

    // Main hydrogen
    const p2xGrids = filterGridsByStorageType(data.energyGrids, 'p2x');
    if (p2xGrids.some(grid => isGridChargeAboveThreshold(grid, 'p2x', STORAGE_CHARGE_THRESHOLD_MIN)) || data.hydrogen.hydrogenPricePerKg >= HYDROGEN_SUPER_PRICE_THRESHOLD_MIN) {
      sellHydrogen = true;
    }

    // Silo hydrogen
    if (data.hydrogen.hydrogenSiloHolding > 0) {
      sellHydrogenSilo = true;
    }
  }

  // Storage & Plants management
  if (true) {
    manageStoragesPlants = true;
  }

  // Solar plants
  // const solarPlantsToReenable: string[] = [];
  // const discrepancyThreshold = 0.25;
  // for (const grid of data.energyGrids) {
  //   for (const storage of grid.storages) {
  //     if (storage.plantsConnected > 0) {
  //       const expectedCharge = storage.expectedChargePerSec;
  //       const actualCharge = storage.chargePerSec;
  //       if (expectedCharge > 0 && actualCharge / expectedCharge < (1 - discrepancyThreshold)) {
  //         reenableSolarPlants = true;
  //         const affectedPlantIds = data.plants
  //           .filter(plant => plant.storageId.toString() === storage.id && plant.plantType === 'solar')
  //           .map(plant => plant.plantId);
  //         solarPlantsToReenable.push(...affectedPlantIds);
  //       }
  //     }
  //   }
  // }

  // Buy Co2 quotas
  if (data.co2Value < CO2_PRICE_THRESHOLD_MAX && data.emissionPerKwh > 1) {
    buyCo2Quotas = true;
  }

  // Oil, Uranium, Coal commodities
  if (
    data.oilBuyPricePerKg < OIL_PRICE_THRESHOLD_MAX ||
    data.coalPricePerKg < COAL_PRICE_THRESHOLD_MAX ||
    data.uraniumPricePerKg < URANIUM_PRICE_THRESHOLD_MAX
  ) {
    buyCommodities = true;
  }

  if (data.hydrogen.hydrogenSiloHolding < data.hydrogen.hydrogenSiloCapacity) {
    storeHydrogen = true;
  }

  // Research
  const researchBudget = data.userMoney * RESEARCH_BUDGET_PERCENTAGE;
  if (
    data.research.availableResearchStations > 0 &&
    data.research.researchData.length > 0 &&
    data.research.researchData.some(research => research.price <= researchBudget)
  ) {
    doResearch = true;
  }

  // Vessels
  vesselRequireAttention = data.vessels.some(vessel => vessel.status !== VesselStatus.Enroute && vessel.status !== VesselStatus.Scanning && vessel.status !== VesselStatus.Drilling);

  return {
    sellEnergy,
    sellHydrogen,
    sellHydrogenSilo,

    manageStoragesPlants,

    buyCo2Quotas,
    buyCommodities,

    storeHydrogen,

    doResearch,

    vesselRequireAttention,
  };
}
