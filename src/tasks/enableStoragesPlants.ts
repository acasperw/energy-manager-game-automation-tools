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
const FUEL_BASED_PLANTS = ['fossil', 'uranium'];

/**
 * Refuels and enables storage plants based on storage capacity.
 *
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
  let totalDisabled = 0;
  let didRefuel = false;
  let pctRefueled = 0;

  try {
    await ensureSidebarOpen(page, 'plants');
    await page.waitForSelector('#production-plants-container', { visible: true });

    const refuelResult = await reFuelPlants(page, data);
    didRefuel = refuelResult.didRefuel;
    pctRefueled = refuelResult.pctRefueled;

    // Filter offline plants for enabling
    const offlinePlants: Plant[] = data.plants.filter(plant => !plant.online);
    const plantToggleSelectors: string[] = offlinePlants.map(plant => `${PLANT_TOGGLE_SELECTOR_PREFIX}${plant.plantId}`);

    // Process enabling in batches
    for (let i = 0; i < plantToggleSelectors.length; i += BATCH_SIZE) {
      const batchSelectors = plantToggleSelectors.slice(i, i + BATCH_SIZE);
      const batchPlants = offlinePlants.slice(i, i + BATCH_SIZE);

      await Promise.all(batchSelectors.map(async (selector, index) => {
        const plant = batchPlants[index];
        try {
          const grid = data.energyGrids.find(grid => grid.storages.some(storage => storage.id === plant.storageId.toString()));
          if (!grid || grid.discharging) {
            totalSkipped++;
            return;
          }

          const exists = await page.$(selector);
          if (!exists) {
            await captureScreenshot(page, `toggle_not_found_plant_${plant.plantId}.png`);
            totalSkipped++;
            return;
          }

          const plantHasFuel = await page.$eval(selector, (toggle) => {
            const parent = toggle.parentElement?.parentElement;
            return !parent?.classList.contains('not-active-fuel');
          });

          // Plant is either discharging or out of fuel
          if (!plantHasFuel) {
            totalSkipped++;
            totalOutOfFuel++;
            return;
          }

          // If the storage is full, skip enabling the plant
          const storage = grid.storages.find(s => s.id === plant.storageId.toString());
          if (storage && storage.currentCharge >= storage.capacity) {
            totalSkipped++;
            return;
          }

          // Attempt to enable the plant
          await clickElement(page, selector);
        } catch (plantError) {
          console.error(`Error processing plant ID: ${plant.plantId}`, plantError);
          await captureScreenshot(page, `refuelEnableStoragesPlants_error_plant_${plant.plantId}.png`);
        } finally {
          totalEnabled++;
        }
      }));
    }
  } catch (error) {
    console.error('Error in refuelEnableStoragesPlants:', error);
    await captureScreenshot(page, 'refuelEnableStoragesPlants_error.png');
  } finally {
    return {
      totalEnabled,
      totalSkipped,
      totalOutOfFuel,
      didRefuel,
      pctRefueled,
      totalDisabled
    };
  }
}

/**
 * Refuels oil plants by setting the fuel slider to its maximum value.
 * @param page - The Puppeteer Page instance.
 * @param data - The current game session data.
 * @returns A boolean indicating whether refueling was performed.
 */
async function reFuelPlants(page: Page, data: GameSessionData): Promise<{ didRefuel: boolean, pctRefueled: number }> {
  let didRefuel = false;
  let pctRefueled = 0;
  await switchTab(page, 'plants');

  try {
    // We only can refuel oil plants that are offline
    const offlineFuelPlants: Plant[] = data.plants.filter(plant => !plant.online && FUEL_BASED_PLANTS.includes(plant.plantType));
    if (offlineFuelPlants.length === 0) {
      return { didRefuel, pctRefueled };
    }

    // Check if the fuel management container exists and is not hidden
    const fuelManagementExists = await ifElementExists(page, "#fuel-management-container");
    let isHidden = false;

    if (fuelManagementExists) {
      isHidden = await page.$eval("#fuel-management-container", (el) => el.classList.contains("hidden"));
    }

    if (fuelManagementExists && !isHidden && offlineFuelPlants.length > 0) {
      await page.waitForSelector('#fuel-management-main');
      await clickElement(page, '#fuel-management');
      await page.waitForFunction(() => {
        const fuelManagement = document.querySelector('#fuel-management-main');
        return (fuelManagement as HTMLElement)?.style.display === 'block';
      });
      await delay(400);

      // Refuel Oil plants
      const { min, max, value } = await getSliderValues(page);

      if (value !== undefined && value < max) {
        const pctToSet = max; // Set to maximum percentage
        const fuelType = 'oil';

        // Perform the AJAX POST request to refuel
        const response = await page.evaluate(
          async (mode: string, pct: number, type: string) => {
            const url = `/fuel-management.php?mode=${mode}&pct=${pct}&type=${type}`;
            const fetchResponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            return { status: fetchResponse.status, ok: fetchResponse.ok };
          }, 'do', pctToSet, fuelType
        );

        if (response.ok) {
          pctRefueled = pctToSet;
          didRefuel = true;
        } else {
          console.error(`Failed to refuel ${fuelType} plants. Server responded with status: ${response.status}`);
          await captureScreenshot(page, `refuelOilPlants_failed_${pctToSet}.png`);
        }
      }
    }
  } catch (error) {
    console.error('Error in reFuelPlants:', error);
    await captureScreenshot(page, 'reFuelPlants_error.png');
  }
  return { didRefuel, pctRefueled };
}
