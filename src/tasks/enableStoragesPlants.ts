import { Page } from "puppeteer";
import { EnableStoragesPlantsResult, GameSessionData } from "../types/interface";
import { ensureSidebarOpen, switchTab } from "../automation/interactions";
import { clickElement } from "../automation/helpers";
import { captureScreenshot } from "../automation/browser";
import { Plant } from "../types/api";

const BATCH_SIZE = 10; // Adjust based on performance testing
const PLANT_TOGGLE_SELECTOR_PREFIX = '#pwr-pane-toggle-';

export async function enableStoragesPlants(
  page: Page,
  data: GameSessionData
): Promise<EnableStoragesPlantsResult> {
  let totalEnabled = 0;
  let totalSkipped = 0;
  let totalOutOfFuel = 0;

  try {
    await ensureSidebarOpen(page);
    await switchTab(page, 'plants');
    await page.waitForSelector('#production-plants-container');

    const offlinePlants: Plant[] = data.plants.filter(plant => plant.online === 0);
    const plantToggleSelectors: string[] = offlinePlants.map(plant => `${PLANT_TOGGLE_SELECTOR_PREFIX}${plant.plantId}`);
    for (let i = 0; i < plantToggleSelectors.length; i += BATCH_SIZE) {
      const batchSelectors = plantToggleSelectors.slice(i, i + BATCH_SIZE);
      const batchPlants = offlinePlants.slice(i, i + BATCH_SIZE);

      await Promise.all(batchSelectors.map(async (selector, index) => {
        const plant = batchPlants[index];
        try {
          const exists = await page.$(selector);
          if (!exists) {
            console.warn(`Toggle selector not found for plant ID: ${plant.plantId}`);
            totalSkipped++;
            return;
          }

          const oilPlantHasFuel = await page.$eval(selector, (toggle) => {
            const parent = toggle.parentElement?.parentElement;
            return !parent?.classList.contains('not-active-fuel');
          });

          if (!oilPlantHasFuel) {
            totalSkipped++;
            totalOutOfFuel++;
            return;
          }

          const grid = data.energyGrids.find(grid =>
            grid.storages.some(storage => storage.id === plant.storageId.toString())
          );

          if (!grid) {
            console.warn(`Grid not found for plant ID: ${plant.plantId}`);
            totalSkipped++;
            return;
          }

          const storage = grid.storages.find(s => s.id === plant.storageId.toString());
          if (storage && storage.currentCharge >= storage.capacity) { // If hydrogen? storage.type === 'p2x' &&
            totalSkipped++;
            return;
          }

          // Attempt to enable the plant
          await clickElement(page, selector);
          totalEnabled++;
        } catch (plantError) {
          console.error(`Error processing plant ID: ${plant.plantId}`, plantError);
          await captureScreenshot(page, `enableStoragesPlants_error_plant_${plant.plantId}.png`);
          totalSkipped++;
        }
      }));
    }

    return { totalEnabled, totalSkipped, totalOutOfFuel };
  } catch (error) {
    console.error('Error in enableStoragesPlants:', error);
    await captureScreenshot(page, 'enableStoragesPlants_error.png');
    return { totalEnabled, totalSkipped, totalOutOfFuel };
  }
}
