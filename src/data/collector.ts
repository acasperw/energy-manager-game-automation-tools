import { Page } from "puppeteer";
import { GameSessionData, GridStorage, StorageInfo } from "../types/interface";
import { BASE_URL } from "../config";
import { Plant, ProductionData, UserData } from "../types/api";

export async function fetchGameSessionData(page: Page): Promise<GameSessionData> {
  // Define API endpoints
  const userDataEndpoint = `${BASE_URL}/api/user.data.php`;
  const productionDataEndpoint = `${BASE_URL}/api/production.php`;
  const hydrogenDataEndpoint = `${BASE_URL}/api/price.history.api.php?target=hydrogen`;
  const co2DataEndpoint = `${BASE_URL}/api/price.history.api.php?target=co2`;
  const demandUpdateEndpoint = `${BASE_URL}/api/demand.update.php`;

  const [userData, productionData, hydrogenData, co2Data] = await Promise.all([
    fetchApiData<UserData>(page, userDataEndpoint),
    fetchApiData<ProductionData>(page, productionDataEndpoint),
    fetchApiData<number[]>(page, hydrogenDataEndpoint),
    fetchApiData<number[]>(page, co2DataEndpoint),
  ]);

  // Get grid demand list
  const gridList = Object.keys(userData.grid).reduce((acc, key) => { acc[key] = parseInt(key); return acc; }, {} as Record<string, number>);
  const demandUpdateResponse = await postApiData<Record<string, number>>(page, demandUpdateEndpoint, { gridList });

  // Process energy grids
  const energyGrids = processEnergyGrids(userData, productionData, demandUpdateResponse);

  // Process plants
  const plants = processPlants(userData.plants);

  return {
    plants: plants,
    energyGrids,
    hydrogenValue: hydrogenData.at(-1) ?? 0,
    emissionPerKwh: userData.userData.emissionPerKwh ?? 0,
    co2Value: co2Data.at(-1) ?? 0,
  };
}

function processPlants(plants: UserData['plants']): Plant[] {
  const processedPlants: Plant[] = [];
  for (const [plantId, plant] of Object.entries(plants)) {
    processedPlants.push({
      plantId,
      plantType: plant.plantType,
      online: plant.online,
      wear: plant.wear,
      output: plant.output,
      capacity: plant.capacity,
      windspeed: plant.windspeed,
      cloudcover: plant.cloudcover,
      storageId: plant.storageId,
      lat: plant.lat,
      lon: plant.lon
    });
  }
  return processedPlants;
}

function processEnergyGrids(userData: UserData, productionData: ProductionData, demandUpdateResponse: Record<string, number>): GridStorage[] {
  const gridMap = new Map<string, GridStorage>();

  for (const [storageId, storage] of Object.entries(productionData)) {
    const gridId = storage.landId.toString();
    const gridName = userData.grid[gridId]?.gridName ?? 'Unknown Grid';
    const mwhValue = storage.value * 1000;
    const pctOfMaxPrice = storage.pctOfMaxPrice;
    const demand = demandUpdateResponse[gridId] ?? 0;
    const currentCharge = storage.currentCharge;
    const capacity = storage.capacity;
    const storageType = storage.type;

    const storageInfo: StorageInfo = {
      id: storageId,
      type: storageType,
      currentCharge,
      capacity,
    };

    if (!gridMap.has(gridId)) {
      gridMap.set(gridId, {
        gridId,
        gridName,
        storages: [storageInfo],
        mwhValue,
        pctOfMaxPrice,
        demand,
        isLowDemand: demand < 10000 || demand < currentCharge,
        totalCurrentCharge: currentCharge,
        totalCapacity: capacity,
        chargePercentage: (currentCharge / capacity) * 100,
        discharging: userData.storage[storageId].discharging === 1,
      });
    } else {
      const existingGrid = gridMap.get(gridId)!;
      existingGrid.storages.push(storageInfo);
      existingGrid.totalCurrentCharge += currentCharge;
      existingGrid.totalCapacity += capacity;
      existingGrid.isLowDemand = existingGrid.isLowDemand || (demand < 10000 || demand < existingGrid.totalCurrentCharge);
      existingGrid.chargePercentage = (existingGrid.totalCurrentCharge / existingGrid.totalCapacity) * 100;
    }
  }

  return Array.from(gridMap.values());
}

async function fetchApiData<T>(page: Page, url: string): Promise<T> {
  return await page.evaluate(async (url) => {
    const response = await fetch(url);
    return await response.json();
  }, url) as T;
}

async function postApiData<T>(page: Page, url: string, data: any): Promise<T> {
  return await page.evaluate(async (url, data) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  }, url, data) as T;
}