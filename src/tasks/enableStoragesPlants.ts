import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { ensureSidebarOpen, switchTab } from "../automation/interactions";
import { clickElement } from "../automation/helpers";
import { captureScreenshot } from "../automation/browser";

export async function enableStoragesPlants(page: Page, data: GameSessionData): Promise<number> {
  let totalEnabled = 0;
  try {
    await ensureSidebarOpen(page);
    await switchTab(page, 'plants');

    const plants = data.plants.filter(plant => plant.online === 0);
    for (const plant of plants) {
      const relevantStorage = data.energyGrids.find(storage => storage.storages.some(s => s.id === plant.storageId.toString()));
      if (!relevantStorage?.discharging) {
        const plantId = plant.plantId;
        const plantToggleSelector = `#pwr-pane-toggle-${plantId}`;
        await page.waitForSelector(plantToggleSelector);
        await clickElement(page, plantToggleSelector);
        totalEnabled++;
      }
    }

    return totalEnabled;
  } catch (error) {
    console.error('Error in enableStoragesPlants:', error);
    await captureScreenshot(page, 'enableStoragesPlants');
    return totalEnabled;
  }
}
