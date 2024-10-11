import { Page } from "puppeteer";
import { GameSessionData, HydrogenSalesInfo, TaskDecisions } from "../types/interface";
import { postApiData } from "../utils/api-requests";

export async function sellGridHydrogen(page: Page, data: GameSessionData, decisions: TaskDecisions): Promise<HydrogenSalesInfo> {
  let totalSales = 0;
  let saleIncludesSilo = false;

  // Sell main hydrogen
  if (decisions.sellHydrogen && data.hydrogen.sellValue > 0) {
    try {
      await postApiData(page, '/hydrogen-exchange-sell.php?units=' + data.hydrogen.p2xStorageIds.join(','));
      totalSales += data.hydrogen.sellValue;
    } catch (error) {
      console.error('Error selling grid hydrogen:', error);
    }
  }

  // Check for silo and sell if available
  if (decisions.sellHydrogenSilo && data.hydrogen.siloSellValue > 0) {
    try {
      await postApiData(page, 'hydrogen-exchange.php?mode=siloSale');
      totalSales += data.hydrogen.siloSellValue;
      saleIncludesSilo = true;
    } catch (error) {
      console.error('Error selling grid hydrogen (Silo):', error);
    }
  }

  return { sale: totalSales, includingSilo: saleIncludesSilo };
}

// export async function sellGridHydrogen(page: Page, data: GameSessionData, decisions: TaskDecisions): Promise<HydrogenSalesInfo> {
//   let totalSales = 0;
//   let saleIncludesSilo = false;
//   try {
//     await clickElement(page, '.footer-new .col[onclick="popup(\'power-exchange.php\');"]');
//     await waitForMainModal(page);

//     await page.waitForSelector('#header-plants');
//     await clickElement(page, '#header-plants');

//     await delay(1100);

//     // Sell main hydrogen
//     if (decisions.sellHydrogen) {
//       const hydrogenPrice = await getNumericValue(page, '.total-hydrogen-value');
//       if (hydrogenPrice > 0) {
//         await page.waitForSelector('#main-hydrogen-sell-btn');
//         await page.waitForFunction(() => {
//           const button = document.querySelector('#main-hydrogen-sell-btn');
//           return button &&
//             !button.hasAttribute('disabled') &&
//             !button.classList.contains('not-active');
//         });
//         await clickElement(page, '#main-hydrogen-sell-btn');

//         const salesTotal = await getSalesResultPopup(page);
//         totalSales += salesTotal;
//       }
//     }

//     // Check for silo and sell if available
//     const siloButtons = await page.$$('#main-hydrogen-sell-btn');
//     if (siloButtons.length > 1) {
//       const siloValue = await getNumericValue(page, '.xl-text.util-blue.fw-bold');
//       const siloButtonActive = await page.evaluate(() => {
//         const siloButton = document.querySelectorAll('#main-hydrogen-sell-btn')[1];
//         return siloButton && !siloButton.classList.contains('not-active');
//       });
//       if (siloValue > 0 && siloButtonActive) {
//         await siloButtons[1].click();
//         totalSales += siloValue;
//         saleIncludesSilo = true;
//       }
//     }
//   } catch (error) {
//     console.error('Error selling grid hydrogen:', error);
//     captureScreenshot(page, 'sellGridHydrogen.png');
//   } finally {
//     await closeMainModal(page);
//     return { sale: totalSales, includingSilo: saleIncludesSilo };
//   }
// }
