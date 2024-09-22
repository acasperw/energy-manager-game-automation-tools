import { Page } from "puppeteer";
import { RefuelEnableStoragesPlantsResult, GameSessionData } from "../types/interface";
import { ensureSidebarOpen, switchTab } from "../automation/interactions";
import { clickElement, ifElementExists } from "../automation/helpers";
import { captureScreenshot } from "../automation/browser";
import { Plant } from "../types/api";
import { getSliderValues } from "../utils/browser-data-helpers";
import { delay } from "../utils/helpers";

const BATCH_SIZE = 10; // Adjust based on performance testing
const PLANT_TOGGLE_SELECTOR_PREFIX = '#pwr-pane-toggle-';

/**
 * Refuels and enables storage plants.
 * @param page - The Puppeteer Page instance.
 * @param data - The current game session data.
 * @returns An object containing the results of the operation.
 */
export async function refuelEnableStoragesPlants(
  page: Page,
  data: GameSessionData
): Promise<RefuelEnableStoragesPlantsResult> {
  let totalEnabled = 0;
  let totalSkipped = 0;
  let totalOutOfFuel = 0;
  let didRefuel = false;

  try {
    await ensureSidebarOpen(page);
    await switchTab(page, 'plants');
    await page.waitForSelector('#production-plants-container', { visible: true });

    didRefuel = await reFuelPlants(page, data);

    // Filter plants that are offline
    const offlinePlants: Plant[] = data.plants.filter(plant => !plant.online);
    const plantToggleSelectors: string[] = offlinePlants.map(plant => `${PLANT_TOGGLE_SELECTOR_PREFIX}${plant.plantId}`);

    // Process in batches
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
            // Plant is either discharging or out of fuel
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
          if (storage && storage.currentCharge >= storage.capacity) {
            totalSkipped++;
            return;
          }

          // Attempt to enable the plant
          await clickElement(page, selector);
          totalEnabled++;
        } catch (plantError) {
          console.error(`Error processing plant ID: ${plant.plantId}`, plantError);
          await captureScreenshot(page, `refuelEnableStoragesPlants_error_plant_${plant.plantId}.png`);
          totalSkipped++;
        }
      })
      );
    }

    return { totalEnabled, totalSkipped, totalOutOfFuel, didRefuel };
  } catch (error) {
    console.error('Error in refuelEnableStoragesPlants:', error);
    await captureScreenshot(page, 'refuelEnableStoragesPlants_error.png');
    return { totalEnabled, totalSkipped, totalOutOfFuel, didRefuel };
  }
}

/**
 * Refuels oil plants by setting the fuel slider to its maximum value.
 * @param page - The Puppeteer Page instance.
 * @param data - The current game session data.
 * @returns A boolean indicating whether refueling was performed.
 */
async function reFuelPlants(page: Page, data: GameSessionData): Promise<boolean> {
  let didRefuel = false;

  try {
    // Check if the fuel management container exists
    if (await ifElementExists(page, '#fuel-management-container')) {
      await page.waitForSelector('#fuel-management-main');
      await clickElement(page, '#fuel-management');
      await page.waitForFunction(() => {
        const fuelManagement = document.querySelector('#fuel-management-main');
        return (fuelManagement as HTMLElement)?.style.display === 'block';
      });
      await delay(400);

      const { min, max, value } = await getSliderValues(page);

      if (value < max) {
        const pctToSet = max; // Set to maximum percentage
        const fuelType = 'oil';

        // Perform the AJAX POST request to refuel
        const response = await page.evaluate(
          async (mode: string, pct: number, type: string) => {
            const url = `/fuel-management.php?mode=${mode}&pct=${pct}&type=${type}`;
            const fetchResponse = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
            });
            return { status: fetchResponse.status, ok: fetchResponse.ok };
          }, 'do', pctToSet, fuelType
        );

        if (response.ok) {
          console.log(`Successfully refueled ${fuelType} plants to ${pctToSet}%`);
          didRefuel = true;

          // Optionally, wait for a confirmation element or message
          // await page.waitForTimeout(1000); // Adjust based on actual response time
        } else {
          console.error(`Failed to refuel ${fuelType} plants. Server responded with status: ${response.status}`);
          await captureScreenshot(page, `refuelOilPlants_failed_${pctToSet}.png`);
        }
      }
    } else {
      console.warn('Fuel management container not found. Skipping refueling.');
    }
  } catch (error) {
    console.error('Error in reFuelPlants:', error);
    await captureScreenshot(page, 'reFuelPlants_error.png');
  }

  return didRefuel;
}
