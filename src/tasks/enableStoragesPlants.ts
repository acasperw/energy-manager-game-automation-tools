import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { ensureSidebarOpen, switchTab } from "../automation/interactions";
import { clickElement } from "../automation/helpers";
import { captureScreenshot } from "../automation/browser";

export async function enableStoragesPlants(page: Page, data: GameSessionData): Promise<{ totalEnabled: number, totalSkipped: number }> {
  let totalEnabled = 0;
  let totalSkipped = 0;
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
        const canEnable = await page.$eval(plantToggleSelector, (toggle) => {
          const parent = toggle.parentElement?.parentElement;
          return !parent?.classList.contains('not-active-fuel');
        });
        if (canEnable) {
          await clickElement(page, plantToggleSelector);
          totalEnabled++;
        } else {
          totalSkipped++;
        }
      }
    }

    return { totalEnabled, totalSkipped };
  } catch (error) {
    console.error('Error in enableStoragesPlants:', error);
    await captureScreenshot(page, 'enableStoragesPlants.png');
    return { totalEnabled, totalSkipped };
  }
}
