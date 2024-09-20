import { Page } from 'puppeteer';
import { GameSessionData, TaskDecisions } from '../types/interface';
import { ensureSidebarOpen, switchTab } from '../automation/interactions';
import { getSunrise, getSunset } from 'sunrise-sunset-js';
import { delay } from '../utils/helpers';
import { Plant } from '../types/api';
import { clickElement } from '../automation/helpers';

export async function reEnableSolarPlants(page: Page, data: GameSessionData, decisions: TaskDecisions): Promise<number> {
  let enabledSolarPlants = 0;
  try {
    const plantsToReenableIds = decisions.solarPlantsToReenable || [];
    if (plantsToReenableIds.length === 0) {
      return enabledSolarPlants;
    }
    await ensureSidebarOpen(page);
    await switchTab(page, 'plants');
    await page.waitForSelector('#production-plants-container');
    const plantsMap = new Map<string, Plant>();
    data.plants.forEach(plant => { plantsMap.set(plant.plantId, plant); });

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
        await page.waitForSelector(plantToggleSelector);
        await clickElement(page, plantToggleSelector); // Toggle off
        await delay(300);
        await clickElement(page, plantToggleSelector); // Toggle on
        enabledSolarPlants++;
      }
    }
    return enabledSolarPlants;
  } catch (error) {
    console.error('Error in reEnableSolarPlants:', error);
    return enabledSolarPlants;
  }
}

function isDaylight(latitude: number, longitude: number): boolean {
  const now = new Date();
  const sunrise = getSunrise(latitude, longitude);
  const sunset = getSunset(latitude, longitude);
  return now >= sunrise && now <= sunset;
}
