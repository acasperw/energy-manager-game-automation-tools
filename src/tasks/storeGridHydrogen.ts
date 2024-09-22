import { Page } from "puppeteer";
import { clickElement } from "../automation/helpers";
import { getNumericValue } from "../utils/browser-data-helpers";
import { delay } from "../utils/helpers";
import { captureScreenshot } from "../automation/browser";
import { GameSessionData } from "../types/interface";

export async function storeGridHydrogen(page: Page, data: GameSessionData): Promise<boolean> {
  let didStoreHydrogen = false;
  try {
    await clickElement(page, '.footer-new .col[onclick="popup(\'power-exchange.php\');"]');

    await page.waitForSelector('#header-plants');
    await clickElement(page, '#header-plants');

    await delay(1000);

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
    await page.click('#main-modal-container .opa-light.text-center.intro-disable');
    await page.waitForSelector('#main-modal-container', { hidden: true });
    return didStoreHydrogen;
  }
}
