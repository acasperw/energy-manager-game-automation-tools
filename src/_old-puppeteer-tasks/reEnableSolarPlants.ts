import { Page } from 'puppeteer';
import { GameSessionData, ReEnablePlantsResult, TaskDecisions } from '../types/interface';
import { ensureSidebarOpen, getEnergyOutputAmount } from '../automation/interactions';
import { getSunrise, getSunset } from 'sunrise-sunset-js';
import { delay } from '../utils/helpers';
import { Plant } from '../types/api';
import { clickElement, ifElementExists } from '../automation/helpers';
import { captureScreenshot } from '../automation/browser';

/**
 * @deprecated since version 2.3
 */
export async function reEnableSolarPlants(page: Page, data: GameSessionData, decisions: TaskDecisions): Promise<ReEnablePlantsResult> {
  let reEnablePlants = { enabledPlants: 0, kwEnergyBefore: 0, kwEnergyAfter: 0 };
  try {
    reEnablePlants.kwEnergyBefore = await getEnergyOutputAmount(page) ?? 0;
    const plantsToReenableIds: string[] = [];

    // Solar plants
    const discrepancyThreshold = 0.25;
    for (const grid of data.energyGrids) {
      for (const storage of grid.storages) {
        if (storage.plantsConnected > 0) {
          const expectedCharge = storage.expectedChargePerSec;
          const actualCharge = storage.chargePerSec;
          if (expectedCharge > 0 && actualCharge / expectedCharge < (1 - discrepancyThreshold)) {
            const affectedPlantIds = data.plants
              .filter(plant => plant.storageId.toString() === storage.id && plant.plantType === 'solar')
              .map(plant => plant.plantId);
            plantsToReenableIds.push(...affectedPlantIds);
          }
        }
      }
    }

    if (plantsToReenableIds.length === 0) {
      return reEnablePlants;
    }
    await ensureSidebarOpen(page, 'plants');
    await page.waitForSelector('#production-plants-container');
    const plantsMap = new Map<string, Plant>();
    data.plants.forEach(plant => { plantsMap.set(plant.plantId, plant); });
    await delay(400);

    for (const plantId of plantsToReenableIds) {
      const plant = plantsMap.get(plantId);
      if (!plant) {
        console.warn(`Plant with ID ${plantId} not found.`);
        continue;
      }
      if (plant.plantType !== 'solar') {
        continue;
      }
      if (!isDaylight(plant.lat, plant.lon)) {
        continue;
      }
      const relevantStorage = data.energyGrids.find(storage => storage.storages.some(s => s.id === plant.storageId.toString()));
      if (!relevantStorage?.discharging) {
        const plantToggleSelector = `#pwr-pane-toggle-${plantId}`;
        if (await ifElementExists(page, plantToggleSelector)) {
          await page.waitForSelector(plantToggleSelector);
          await clickElement(page, plantToggleSelector); // Toggle off
          await delay(400);
          await clickElement(page, plantToggleSelector); // Toggle on
          reEnablePlants.enabledPlants++;
        }
      }
    }
    await delay(400);
  } catch (error) {
    console.error('Error in reEnableSolarPlants:', error);
    captureScreenshot(page, 'reEnableSolarPlants.png');
  } finally {
    reEnablePlants.kwEnergyAfter = await getEnergyOutputAmount(page) ?? 0;
    return reEnablePlants;
  }
}

function isDaylight(latitude: number, longitude: number): boolean {
  const now = new Date();
  const sunrise = getSunrise(latitude, longitude);
  const sunset = getSunset(latitude, longitude);
  return now >= sunrise && now <= sunset;
}
