import { Page } from "puppeteer";
import { clickElement } from "../automation/helpers";
import { getSalesResultPopup } from "../automation/interactions";
import { getNumericValue } from "../utils/browser-data-helpers";
import { delay } from "../utils/helpers";
import { HydrogenSalesInfo } from "../types/interface";
import { captureScreenshot } from "../automation/browser";

export async function sellGridHydrogen(page: Page): Promise<HydrogenSalesInfo> {
  let totalSales = 0;
  let saleIncludesSilo = false;
  try {
    await clickElement(page, '.footer-new .col[onclick="popup(\'power-exchange.php\');"]');

    await page.waitForSelector('#header-plants');
    await clickElement(page, '#header-plants');

    await delay(1000);

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
  } catch (error) {
    console.error('Error selling grid hydrogen:', error);
    captureScreenshot(page, 'sellGridHydrogen.png');
  } finally {
    await page.click('#main-modal-container .opa-light.text-center.intro-disable');
    await page.waitForSelector('#main-modal-container', { hidden: true });
    return { sale: totalSales, includingSilo: saleIncludesSilo };
  }
}
