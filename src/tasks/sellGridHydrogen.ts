import { Page } from "puppeteer";
import { clickElement } from "../automation/helpers";
import { getSalesResultPopup } from "../automation/interactions";
import { getNumericValue } from "../utils/browser-data-helpers";
import { delay } from "../utils/helpers";

export async function sellGridHydrogen(page: Page): Promise<number> {
  try {
    await clickElement(page, '.footer-new .col[onclick="popup(\'power-exchange.php\');"]');

    await page.waitForSelector('#header-plants');
    await clickElement(page, '#header-plants');

    await delay(1000);

    const hydrogenValue = await getNumericValue(page, '.total-hydrogen-value');
    if (hydrogenValue === 0) {
      return 0;
    }

    await page.waitForSelector('#main-hydrogen-sell-btn');
    await page.waitForFunction(() => {
      const button = document.querySelector('#main-hydrogen-sell-btn');
      return button &&
        !button.hasAttribute('disabled') &&
        !button.classList.contains('not-active');
    });
    await clickElement(page, '#main-hydrogen-sell-btn');

    const salesTotal = await getSalesResultPopup(page);
    return salesTotal;
  } catch (error) {
    console.error('Error selling grid hydrogen:', error);
    return 0;
  }
}
