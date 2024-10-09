import { Page } from "puppeteer";
import { GameSessionData, GridStorage, ResearchInfo, StorageInfo, VesselInfo, VesselStatus } from "../types/interface";
import { BASE_URL, RESEARCH_SLOTS_TO_KEEP_OPEN } from "../config";
import { Plant, ProductionData, UserData, Vessel } from "../types/api";
import * as cheerio from 'cheerio';
import { parseValueToTonnes } from "../utils/helpers";
import { parseCoordinate } from "../utils/grid-utils";

export async function fetchGameSessionData(page: Page): Promise<GameSessionData> {

  const endpoints = {
    userData: `${BASE_URL}/api/user.data.php`,
    productionData: `${BASE_URL}/api/production.php`,
    hydrogenData: `${BASE_URL}/api/price.history.api.php?target=hydrogen`,
    co2Data: `${BASE_URL}/api/price.history.api.php?target=co2`,
    oilBuyPriceData: `${BASE_URL}/api/price.history.api.php?target=oil`,
    uraniumPriceData: `${BASE_URL}/api/price.history.api.php?target=uranium`,
    demandUpdate: `${BASE_URL}/api/demand.update.php`,
    hydrogenExchange: `${BASE_URL}/hydrogen-exchange.php`,
    checkResearch: `${BASE_URL}/research.php`,
  };

  try {
    const [
      userData,
      productionData,
      hydrogenData,
      co2Data,
      oilBuyPriceData,
      uraniumPriceData,
      hydrogenExchangeResponse,
    ] = await Promise.all([
      fetchApiData<UserData>(page, endpoints.userData),
      fetchApiData<ProductionData>(page, endpoints.productionData),
      fetchApiData<number[]>(page, endpoints.hydrogenData),
      fetchApiData<number[]>(page, endpoints.co2Data),
      fetchApiData<number[]>(page, endpoints.oilBuyPriceData),
      fetchApiData<number[]>(page, endpoints.uraniumPriceData),
      postApiData<string>(page, endpoints.hydrogenExchange),
    ]);

    const researchSlots = userData.userData.researchSlots;
    const userMoney = parseFloat(userData.userData.account);

    // Fetch demand update & research data (if slots available) from API
    const gridList = Object.keys(userData.grid).reduce((acc, key) => { acc[key] = parseInt(key); return acc; }, {} as Record<string, number>);
    const demandUpdatePromise = postApiDataJson<Record<string, number>>(page, endpoints.demandUpdate, { gridList });
    const researchPromise = researchSlots > RESEARCH_SLOTS_TO_KEEP_OPEN ? postApiData<string>(page, endpoints.checkResearch) : Promise.resolve<string | undefined>(undefined);
    const [demandUpdateResponse, checkResearchResponse] = await Promise.all([demandUpdatePromise, researchPromise]);

    // Process api data
    const { plants, storagePlantCount, storagePlantOutputs } = processPlants(userData.plants);
    const energyGrids = processEnergyGrids(userData, productionData, demandUpdateResponse, storagePlantCount, storagePlantOutputs);
    const { hydrogenSiloHolding, hydrogenSiloCapacity } = parseHydrogenSiloData(hydrogenExchangeResponse);
    const research = parseResearchEndpoint(checkResearchResponse, userMoney, researchSlots);
    const vessels = extractVesselInfo(userData.vessel);

    return {
      plants,
      energyGrids,
      emissionPerKwh: userData.userData.emissionPerKwh ?? 0,
      co2Value: co2Data.at(-1) ?? 0,
      oilBuyPrice: oilBuyPriceData.at(-1) ?? 0,
      uraniumPrice: uraniumPriceData.at(-1) ?? 0,
      userMoney,
      hydrogen: {
        hydrogenPrice: hydrogenData.at(-1) ?? 0,
        hydrogenSiloHolding,
        hydrogenSiloCapacity,
      },
      research,
      vessels
    };
  } catch (error) {
    console.error("Failed to fetch game session data:", error);
    throw error;
  }
}

function processPlants(plantsData: UserData['plants']): {
  plants: Plant[],
  storagePlantCount: Record<string, number>,
  storagePlantOutputs: Record<string, number>
} {
  const processedPlants: Plant[] = [];
  const storagePlantCount: Record<string, number> = {};
  const storagePlantOutputs: Record<string, number> = {};

  for (const [plantId, plant] of Object.entries(plantsData)) {
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
      lat: parseCoordinate(plant.lat),
      lon: parseCoordinate(plant.lon),
      fossilStop: plant.fossilStop,
      fuelCapacity: plant.fuelCapacity,
      fuelHolding: plant.fuelHolding
    });

    const storageId = plant.storageId.toString();
    storagePlantCount[storageId] = (storagePlantCount[storageId] || 0) + 1;
    storagePlantOutputs[storageId] = (storagePlantOutputs[storageId] || 0) + plant.output;
  }

  return { plants: processedPlants, storagePlantCount, storagePlantOutputs };
}

function processEnergyGrids(
  userData: UserData,
  productionData: ProductionData,
  demandUpdateResponse: Record<string, number>,
  storagePlantCount: Record<string, number>,
  storagePlantOutputs: Record<string, number>
): GridStorage[] {
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

    const plantsConnected = storagePlantCount[storageId] || 0;
    const totalPlantOutputKW = storagePlantOutputs[storageId] || 0;
    const expectedChargePerSec = totalPlantOutputKW / 1000; // Convert KW to MW

    const storageInfo: StorageInfo = {
      id: storageId,
      type: storageType,
      currentCharge,
      capacity,
      plantsConnected,
      chargePerSec: storage.chargePerSec, // From API data
      expectedChargePerSec,
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
        totalCurrentCharge: plantsConnected > 0 ? currentCharge : 0,
        totalCapacity: plantsConnected > 0 ? capacity : 0,
        chargePercentage: plantsConnected > 0 ? (currentCharge / capacity) * 100 : 0,
        discharging: userData.storage[storageId].discharging === 1,
      });
    } else {
      const existingGrid = gridMap.get(gridId)!;
      existingGrid.storages.push(storageInfo);
      if (plantsConnected > 0) {
        existingGrid.totalCurrentCharge += currentCharge;
        existingGrid.totalCapacity += capacity;
      }
      existingGrid.isLowDemand = existingGrid.isLowDemand || (demand < 10000 || demand < existingGrid.totalCurrentCharge);
      existingGrid.chargePercentage = existingGrid.totalCapacity > 0 ? (existingGrid.totalCurrentCharge / existingGrid.totalCapacity) * 100 : 0;
    }
  }

  return Array.from(gridMap.values());
}

export async function fetchApiData<T>(page: Page, url: string): Promise<T> {
  return await page.evaluate(async (url) => {
    const response = await fetch(url);
    return await response.json();
  }, url) as T;
}

export async function postApiDataJson<T>(page: Page, url: string, data: any): Promise<T> {
  return await page.evaluate(async (url, data) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(data), });
    return await response.json();
  }, url, data) as T;
}

export async function postApiData<T>(page: Page, url: string): Promise<T> {
  return await page.evaluate(async (url) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', } });
    return await response.text();
  }, url) as T;
}

function parseHydrogenSiloData(html: string): { hydrogenSiloHolding: number; hydrogenSiloCapacity: number } {
  const $ = cheerio.load(html);

  // Extract Hydrogen Silo Holding
  const holdingElement = $('.bg-white.h-100.p-2.rounded .text-info').first();
  let hydrogenSiloHolding = 0;
  if (holdingElement.length) {
    const holdingText = holdingElement.text().trim();
    hydrogenSiloHolding = parseValueToTonnes(holdingText);
  } else {
    console.warn("Hydrogen silo holding element not found.");
  }

  // Extract Hydrogen Silo Capacity
  const capacityElement = $('.bg-white.h-100.p-2.rounded .text-secondary.s-text').filter((_, el) => $(el).text().includes('Capacity')).first();
  let hydrogenSiloCapacity = 0;
  if (capacityElement.length) {
    const capacityText = capacityElement.text().trim();
    hydrogenSiloCapacity = parseValueToTonnes(capacityText);
  } else {
    console.warn("Hydrogen silo capacity element not found.");
  }

  return {
    hydrogenSiloHolding: isNaN(hydrogenSiloHolding) ? 0 : hydrogenSiloHolding,
    hydrogenSiloCapacity: isNaN(hydrogenSiloCapacity) ? 0 : hydrogenSiloCapacity,
  };
}

function parseResearchEndpoint(html: string | undefined, accountBalance: number, researchSlots: number): GameSessionData['research'] {

  if (!html || researchSlots <= RESEARCH_SLOTS_TO_KEEP_OPEN) {
    return { availableResearchStations: 0, researchData: [] };
  }

  const $ = cheerio.load(html);

  // Extract Research Station Count
  const researchStationElement = $('#res-slots');
  const availableResearchStations = researchStationElement.length ? parseInt(researchStationElement.text().trim()) : 0;

  const researchData: ResearchInfo[] = [];
  const allResearchAbleElements = $('.res-sorting');

  allResearchAbleElements.each((_, element) => {
    const elem = $(element);

    // 1. Exclude Fully Researched Items
    if (elem.hasClass('completed')) {
      return;
    }

    // 2. Exclude Items with Unmet Prerequisites
    const requireContainer = elem.find('.require-container');
    if (requireContainer.length) {
      return;
    }

    // 3. Exclude Ongoing Research
    const researching = elem.find(`[id^="research-active-"]`).length > 0;
    if (researching) {
      return;
    }

    // 4. Check for Available Research Button
    const button = elem.find('button.res-btn');
    if (button.length === 0) {
      return;
    }

    // 5. Exclude Hidden or Inactive Buttons
    const isHidden = button.hasClass('hidden') || button.hasClass('not-active-light') || button.css('display') === 'none';
    if (isHidden) {
      return;
    }

    // 6. Extract Research ID from Button ID (e.g., 'research-button-2' => 2)
    const buttonId = button.attr('id');
    if (!buttonId) {
      return;
    }

    const idMatch = buttonId.match(/research-button-(\d+)/);
    if (!idMatch || idMatch.length < 2) {
      return;
    }

    const id = parseInt(idMatch[1]);
    if (isNaN(id)) {
      return;
    }

    // 7. Extract Price from Button Text (e.g., '$ 82,960,000' => 82960000)
    const priceText = button.text().trim();
    const priceMatch = priceText.match(/\$[\s,]*([\d,]+)/);
    if (!priceMatch || priceMatch.length < 2) {
      return;
    }

    const price = parseInt(priceMatch[1].replace(/,/g, ''));
    if (isNaN(price)) {
      return;
    }

    // 8. Exclude Items with Insufficient Account Balance
    if (price > accountBalance) {
      return;
    }

    researchData.push({ id, price });
  });

  return {
    availableResearchStations,
    researchData
  };
}

function extractVesselInfo(vessel: Vessel): VesselInfo[] {
  const vesselInfos: VesselInfo[] = [];

  for (const [vesselId, vesselData] of Object.entries(vessel.data)) {
    const isEnroute = vessel.enroute && vessel.enroute[vesselId];
    const isOperating = vessel.operation && vessel.operation[vesselId];
    const fieldLoc = parseInt(vesselData.fieldLoc) || 0;

    let status: VesselStatus = VesselStatus.Anchored;
    let oilOnboard = parseInt(vesselData.oilOnboard) || 0;

    if (isEnroute) {
      status = VesselStatus.Enroute;
    }

    if (isOperating) {
      const operation = vessel.operation![vesselId];
      const scanEndTime = parseInt(operation.scanEnd);
      const drillEndTime = parseInt(operation.drillEnd);
      const currentTime = operation.nowTime;

      if (scanEndTime > currentTime) {
        status = VesselStatus.Scanning;
      } else if (drillEndTime > currentTime) {
        status = VesselStatus.Drilling;
      }
    }

    if (!isEnroute && !isOperating) {
      if (oilOnboard > 0) {
        if (fieldLoc === 0) {
          status = VesselStatus.InPortWithOil;
        } else {
          status = VesselStatus.AnchoredWithOil;
        }
      } else {
        if (fieldLoc === 0) {
          status = VesselStatus.InPort;
        } else {
          status = VesselStatus.Anchored;
        }
      }
    }

    const parsedLocLat = parseCoordinate(vesselData.locLat);
    const parsedLocLon = parseCoordinate(vesselData.locLon);

    vesselInfos.push({
      id: vesselData.id,
      locLat: parsedLocLat,
      locLon: parsedLocLon,
      status,
      oilOnboard,
      vesselName: vesselData.vesselName,
      routeId: vesselData.routeId,
      reverse: vesselData.reverse === '1'
    });
  }

  return vesselInfos;
}
