import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { captureScreenshot } from "../automation/browser";
import { clickElement } from "../automation/helpers";
import { waitForMainModal, closeMainModal } from "../automation/interactions";
import { getNumericValue } from "../utils/browser-data-helpers";
import { delay } from "../utils/helpers";

export async function storeGridHydrogen(page: Page, data: GameSessionData): Promise<boolean> {
  let didStoreHydrogen = false;

  if (data.hydrogen.currentHydrogenStorageCharge > 0 && data.hydrogen.hydrogenSiloHolding < data.hydrogen.hydrogenSiloCapacity) {
    try {
      await clickElement(page, '.footer-new .col[onclick="popup(\'power-exchange.php\');"]');
      await waitForMainModal(page);

      await page.waitForSelector('#header-plants');
      await clickElement(page, '#header-plants');

      await delay(1100);

      await page.waitForSelector('.total-charge-hydrogen');

      const currentHydrogenStorage = await getNumericValue(page, '.total-charge-hydrogen');
      if (currentHydrogenStorage > 0 && data.hydrogen.hydrogenSiloHolding < data.hydrogen.hydrogenSiloCapacity) {
        await clickElement(page, '#silo-transfer');
        didStoreHydrogen = true;
        return didStoreHydrogen;
      }
    } catch (error) {
      console.error('Error storing grid hydrogen:', error);
      captureScreenshot(page, 'storeGridHydrogen.png');
    } finally {
      await closeMainModal(page);
      return didStoreHydrogen;
    }
  }

  return didStoreHydrogen;

}
