import { Page } from "puppeteer";
import { clickElement } from "../automation/helpers";
import { getSalesResultPopup } from "../automation/interactions";
import { getNumericValue } from "../utils/browser-data-helpers";
import { delay } from "../utils/helpers";
import { HydrogenSalesInfo } from "../types/interface";

export async function sellGridHydrogen(page: Page): Promise<HydrogenSalesInfo> {
  try {
    await clickElement(page, '.footer-new .col[onclick="popup(\'power-exchange.php\');"]');

    await page.waitForSelector('#header-plants');
    await clickElement(page, '#header-plants');

    await delay(1000);

    let totalSales = 0;
    let saleIncludesSilo = false;

    // Sell main hydrogen
    const hydrogenValue = await getNumericValue(page, '.total-hydrogen-value');
    if (hydrogenValue > 0) {
      await page.waitForSelector('#main-hydrogen-sell-btn');
      await page.waitForFunction(() => {
        const button = document.querySelector('#main-hydrogen-sell-btn');
        return button &&
          !button.hasAttribute('disabled') &&
          !button.classList.contains('not-active');
      });
      await clickElement(page, '#main-hydrogen-sell-btn');

      const salesTotal = await getSalesResultPopup(page);
      totalSales += salesTotal;
    }

    // Check for silo and sell if available
    const siloButtons = await page.$$('#main-hydrogen-sell-btn');
    if (siloButtons.length > 1) {
      const siloValue = await getNumericValue(page, '.xl-text.util-blue.fw-bold');
      const siloButtonActive = await page.evaluate(() => {
        const siloButton = document.querySelectorAll('#main-hydrogen-sell-btn')[1];
        return siloButton && !siloButton.classList.contains('not-active');
      });
      if (siloValue > 0 && siloButtonActive) {
        await clickElement(page, '#main-hydrogen-sell-btn:nth-of-type(2)');
        totalSales += siloValue;
        saleIncludesSilo = true;
      }
    }

    return { sale: totalSales, includingSilo: saleIncludesSilo };
  } catch (error) {
    console.error('Error selling grid hydrogen:', error);
    return { sale: 0, includingSilo: false };
  }
}
