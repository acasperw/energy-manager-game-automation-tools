import { Page } from "puppeteer";
import { RefuelEnableStoragesPlantsResult, GameSessionData, SidebarType } from "../types/interface";
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
 * Refuels and enables/disables storage plants based on storage capacity.
 * Specifically handles fuel-based plants to ensure they are not enabled when storage is full
 * and are disabled if their associated storage is full.
 *
 * @param page - The Puppeteer Page instance.
 * @param data - The current game session data.
 * @returns An object containing the results of the operation.
 */
export async function refuelEnableStoragesPlants(page: Page, data: GameSessionData): Promise<RefuelEnableStoragesPlantsResult> {

  const result: RefuelEnableStoragesPlantsResult = {
    totalEnabled: 0,
    totalSkipped: 0,
    totalOutOfFuel: 0,
    didRefuel: false,
    pctRefueled: 0,
    totalDisabled: 0
  };

  try {
    await ensureSidebarOpen(page, SidebarType.Production, 'plants');
    await page.waitForSelector('#production-plants-container', { visible: true });

    const refuelResult = await reFuelPlants(page, data);
    result.didRefuel = refuelResult.didRefuel;
    result.pctRefueled = refuelResult.pctRefueled;

    // Filter offline plants for enabling
    const offlinePlants: Plant[] = data.plants.filter(plant => !plant.online);
    const offlinePlantToggleSelectors: string[] = offlinePlants.map(plant => `${PLANT_TOGGLE_SELECTOR_PREFIX}${plant.plantId}`);
    await processPlantBatch(page, offlinePlants, offlinePlantToggleSelectors, data, result, 'enable');

    // Disabling fuel-based plants if their storage is full
    const onlineFuelPlants: Plant[] = data.plants.filter(plant => plant.online && FUEL_BASED_PLANTS.includes(plant.plantType));
    const onlineFuelToggleSelectors: string[] = onlineFuelPlants.map(plant => `${PLANT_TOGGLE_SELECTOR_PREFIX}${plant.plantId}`);
    await processPlantBatch(page, onlineFuelPlants, onlineFuelToggleSelectors, data, result, 'disable');

  } catch (error) {
    console.error('Error in refuelEnableStoragesPlants:', error);
    await captureScreenshot(page, 'refuelEnableStoragesPlants_error.png');
  } finally {
    return result;
  }
}

/**
 * Processes a batch of plants for enabling or disabling.
 * @param page - The Puppeteer Page instance.
 * @param plants - Array of Plant objects to process.
 * @param selectors - Corresponding toggle selectors for the plants.
 * @param data - Current game session data.
 * @param result - The result object to update.
 * @param action - 'enable' or 'disable' to determine the action.
 */
async function processPlantBatch(
  page: Page,
  plants: Plant[],
  selectors: string[],
  data: GameSessionData,
  result: RefuelEnableStoragesPlantsResult,
  action: 'enable' | 'disable'
) {
  for (let i = 0; i < selectors.length; i += BATCH_SIZE) {
    const batchSelectors = selectors.slice(i, i + BATCH_SIZE);
    const batchPlants = plants.slice(i, i + BATCH_SIZE);

    await Promise.all(batchSelectors.map(async (selector, index) => {
      const plant = batchPlants[index];
      try {
        const grid = data.energyGrids.find(grid => grid.storages.some(storage => storage.id === plant.storageId.toString()));

        if (!grid || (action === 'enable' && grid.discharging)) {
          result.totalSkipped++;
          return;
        }

        const exists = await page.$(selector);
        if (!exists) {
          await captureScreenshot(page, `toggle_not_found_plant_${plant.plantId}.png`);
          result.totalSkipped++;
          return;
        }

        const plantHasFuel = await page.$eval(selector, (toggle) => {
          const parent = toggle.parentElement?.parentElement;
          return !parent?.classList.contains('not-active-fuel');
        });

        // Plant is either discharging or out of fuel
        if (!plantHasFuel) {

          result.totalSkipped++;
          result.totalOutOfFuel++;
          return;
        }

        const storage = grid.storages.find(s => s.id === plant.storageId.toString());
        if (storage) {
          if (action === 'enable' && storage.currentCharge >= storage.capacity) {
            result.totalSkipped++;
            return;
          }

          // Only disable if storage is full
          if (action === 'disable' && storage.currentCharge < storage.capacity) {

            return;
          }
        }

        if (action === 'enable') {
          await clickElement(page, selector);
          result.totalEnabled++;
        } else if (action === 'disable') {
          await clickElement(page, selector);
          result.totalDisabled++;
        }

      } catch (plantError) {
        console.error(`Error processing plant ID: ${plant.plantId}`, plantError);
        await captureScreenshot(page, `${action === 'enable' ? 'refuelEnableStoragesPlants' : 'disable'}_plant_error_${plant.plantId}.png`);
        result.totalSkipped++;
      }
    }));
  }
}

/**
 * Refuels oil and uranium plants by setting the fuel slider to its maximum value.
 * @param page - The Puppeteer Page instance.
 * @param data - The current game session data.
 * @returns An object indicating whether refueling was performed and the percentage refueled.
 */
async function reFuelPlants(page: Page, data: GameSessionData): Promise<{ didRefuel: boolean, pctRefueled: number }> {
  let didRefuel = false;
  let pctRefueled = 0;

  try {
    await switchTab(page, SidebarType.Production, 'plants');

    // We only can refuel fuel-based plants that are offline
    const offlineFuelPlants = data.plants.filter(plant => FUEL_BASED_PLANTS.includes(plant.plantType) && !plant.online);

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

      // Setup for more then one fuel type
      // for (const fuelPlantType of FUEL_BASED_PLANTS) {
      //   const fuelType = fuelPlantType === 'fossil' ? 'oil' : fuelPlantType;
      // }

      const { min, max, value } = await getSliderValues(page);

      if (value !== undefined && value < max) {
        const pctToSet = max; // Set to maximum percentage
        const fuelType = 'oil'; // Assuming 'oil' is the type for fossil plants

        // Perform the AJAX POST request to refuel
        const response = await page.evaluate(
          async (mode: string, pct: number, type: string) => {
            const url = `/fuel-management.php?mode=${mode}&pct=${pct}&type=${type}`;
            const fetchResponse = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            return { status: fetchResponse.status, ok: fetchResponse.ok };
          }, 'do', pctToSet, fuelType
        );

        if (response.ok) {
          pctRefueled = pctToSet;
          didRefuel = true;
        } else {
          console.error(`Failed to refuel ${fuelType} plants. Server responded with status: ${response.status}`);
          await captureScreenshot(page, `refuelFuelPlants_failed_${pctToSet}.png`);
        }
      }
    }
  } catch (error) {
    console.error('Error in reFuelPlants:', error);
    await captureScreenshot(page, 'reFuelPlants_error.png');
  }
  return { didRefuel, pctRefueled };
}
