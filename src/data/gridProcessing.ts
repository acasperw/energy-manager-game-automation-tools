import { Page } from "puppeteer";
import { EnergySalesInfo, GridStorage } from "../types/interface";
import { closeMainModal, ensureSidebarOpen, hideSalesResultPopup, waitForMainModal } from "../automation/interactions";
import { delay } from "../utils/helpers";
import { captureScreenshot } from "../automation/browser";
import { clickElement } from "../automation/helpers";

// function getTheoreticalMaxValue(value: number, pctOfMaxPrice: number) {
//   return (value / pctOfMaxPrice) * 100;
// }

export async function processEnergyGrid(page: Page, currentGrid: GridStorage, eligibleGrids: GridStorage[]): Promise<EnergySalesInfo> {
  await hideSalesResultPopup(page);
  await ensureSidebarOpen(page, 'storage');

  const gridClickable = await clickGridAndWaitForDetails(page, currentGrid);
  if (!gridClickable) {
    return { gridName: currentGrid.gridName, sale: 0, additionalProfit: 0, action: 'skipped' };
  }

  // Check for upcoming high value
  const upcomingMwhValue = await extractUpcomingValue(page);
  const maxTopMwhValue = Math.max(...eligibleGrids.map(g => g.mwhValue * 0.88)); // Apply 10% fee and buffer
  if (upcomingMwhValue && upcomingMwhValue > maxTopMwhValue && currentGrid.mwhValue < upcomingMwhValue) {
    await page.click('#details-pane .intro-disable.opa');
    return { gridName: currentGrid.gridName, sale: 0, additionalProfit: 0, action: 'keep', highUpcomingValue: true };
  }

  // Continue with selling
  await clickDollarSignAndWaitForModal(page);
  await openAdvancedTab(page);
  const advancedTabRows = await getAdvancedTabRows(page);
  const bestOption = findBestSellingOption(advancedTabRows, currentGrid, eligibleGrids);
  const sellDecision = determineSellAction(currentGrid, bestOption);

  switch (sellDecision.action) {
    case 'sell':
      if (sellDecision.target === 'alternative') {
        await clickElement(page, bestOption!.buttonSelector)
      } else {
        await clickElement(page, '#sell-to-grid-btn');
      }
      await hideSalesResultPopup(page);
      break;
    case 'keep':
      console.log(`Keeping ${currentGrid.gridName} as conditions are not optimal for selling`);
      break;
  }

  await closeMainModal(page);
  await hideSalesResultPopup(page);

  const soldToGridName = sellDecision.target === 'alternative' ? sellDecision.gridName : (sellDecision.action === 'sell' ? currentGrid.gridName : null);

  return {
    gridName: currentGrid.gridName,
    sale: sellDecision.sale,
    additionalProfit: sellDecision.profit,
    action: sellDecision.action === 'keep' ? 'keep' : 'sold',
    soldTo: soldToGridName,
    highUpcomingValue: false
  };
}

async function clickGridAndWaitForDetails(page: Page, energyGrids: GridStorage) {
  await delay(400);
  await page.waitForSelector('#production-outer', { visible: true });

  // Find a non-p2x storage ID if available
  let nonP2xStorageId = null;
  if (energyGrids.storages && energyGrids.storages.length > 0) {
    const nonP2xStorage = energyGrids.storages.find(storage => storage.type !== 'p2x');
    if (nonP2xStorage) {
      nonP2xStorageId = nonP2xStorage.id;
    }
  }

  // Modify selector to target the specific non-p2x storage if found
  const gridSelector = nonP2xStorageId
    ? `#production-outer .production-inner[data-grid="${energyGrids.gridName}"]:not(.hidden)[id="production-charge-status-${nonP2xStorageId}"] .col-12:not(.pane-discharging):not(.hidden) .col-9.p-row-outer.p-row.pointer:not(.p-row-outer-discharge)`
    : `#production-outer .production-inner[data-grid="${energyGrids.gridName}"]:not(.hidden) .col-12:not(.pane-discharging):not(.hidden) .col-9.p-row-outer.p-row.pointer:not(.p-row-outer-discharge)`;

  try {
    await page.waitForSelector(gridSelector);
    await page.click(gridSelector);
    await page.waitForFunction(
      (gridName) => {
        const detailsPane = document.querySelector('#details-pane') as HTMLElement;
        return detailsPane.style.display === 'block' && detailsPane.textContent?.includes(gridName);
      },
      {},
      energyGrids.gridName
    );
    await delay(100);
    return true;
  } catch (error: any) {
    console.log(`Error processing grid ${energyGrids.gridName}: ${error.message}`);
    await captureScreenshot(page, `error-processing-grid-${energyGrids.gridName}.png`);
    return false;
  }
}

async function extractUpcomingValue(page: Page) {
  return page.evaluate(() => {
    const upcomingValueLabel = Array.from(document.querySelectorAll('#details-pane div')).find(el => el.textContent?.trim() === 'Upcoming value');
    if (upcomingValueLabel) {
      const valueElement = upcomingValueLabel.nextElementSibling;
      if (valueElement) {
        const match = valueElement.textContent?.match(/\$\s*([\d,]+)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : null;
      }
    }
    return null;
  });
}

async function clickDollarSignAndWaitForModal(page: Page) {
  await page.waitForSelector('.bi.bi-currency-dollar');
  await page.click('#details-pane .bi.bi-currency-dollar');
  await waitForMainModal(page);
}

async function openAdvancedTab(page: Page) {
  const advancedButtonExists = await page.evaluate(() => {
    const buttons = document.querySelectorAll('#main-modal-container button');
    return buttons.length >= 2;
  });

  if (advancedButtonExists) {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('#main-modal-container button');
      (buttons[1] as HTMLElement).click();
    });
    await page.waitForSelector('#advanced-tab', { timeout: 10000 }).catch(() => console.log('Advanced tab did not appear'));
  }
  await delay(200);
}

async function getAdvancedTabRows(page: Page): Promise<BestSellingOption[]> {
  return page.evaluate(() => {

    function convertCurrencyToNumber(currencyString: string) {
      let numericString = currencyString.replace(/[\$,]/g, '');
      let numericValue = parseInt(numericString, 10);
      return numericValue;
    }

    const rows = [];
    const allDivs = document.querySelectorAll('#advanced-tab .row.g-0.mt-1 > div');

    for (let i = 0; i < allDivs.length; i += 3) {
      const gridName = allDivs[i].textContent?.trim();
      const mwhValue = parseFloat(allDivs[i + 1].textContent!.trim().replace('$', '').replace(',', '').split(' ')[0]);
      const sellValue = convertCurrencyToNumber(allDivs[i + 2].querySelector('span.fw-bold')!.textContent!.trim());

      rows.push({
        gridName: gridName!,
        mwhValue: mwhValue,
        sellValue: sellValue,
        buttonSelector: `#advanced-tab .row.g-0.mt-1 > div:nth-child(${i + 3}) button`
      });
    }
    return rows;
  });
}

interface BestSellingOption {
  gridName: string;
  mwhValue: number;
  sellValue: number;
  buttonSelector: string;
}

function findBestSellingOption(advancedTabRows: BestSellingOption[], currentGrid: GridStorage, eligibleGrids: GridStorage[]): BestSellingOption | null {
  const eligibleOptions = advancedTabRows.filter(row =>
    eligibleGrids.some(grid => grid.gridName === row.gridName)
  );

  if (eligibleOptions.length === 0) {
    console.log(`No eligible selling options (out of ${advancedTabRows.length}) found in advanced tab`);
    return null;
  }

  const currentGridSellValue = (currentGrid.mwhValue * currentGrid.totalCurrentCharge) / 1000;

  const bestAlternative = eligibleOptions.reduce((best, current) => {
    const alternativeGridAverage = current.mwhValue;
    const alternativeSellValue = (current.mwhValue * currentGrid.totalCurrentCharge * 0.9) / 1000;

    if (current.mwhValue >= alternativeGridAverage * 0.9 && alternativeSellValue > best.sellValue) {
      return {
        ...current,
        sellValue: alternativeSellValue
      };
    }
    return best;
  }, { sellValue: 0 });

  if (bestAlternative.sellValue === 0) {
    return null;
  }

  if (bestAlternative.sellValue > currentGridSellValue * 1.1) {
    return bestAlternative as BestSellingOption;
  } else {
    return null;
  }

}

function determineSellAction(currentGrid: GridStorage, bestAlternative: BestSellingOption | null) {
  const currentGridSellValue = (currentGrid.mwhValue * currentGrid.totalCurrentCharge) / 1000;
  const currentGridAverage = currentGrid.mwhValue;

  if (bestAlternative) {
    return {
      action: 'sell',
      target: 'alternative',
      gridName: bestAlternative.gridName,
      profit: bestAlternative.sellValue - currentGridSellValue,
      sale: bestAlternative.sellValue
    };
  }

  // If the current grid price is within 10% of its average
  if (currentGrid.mwhValue >= currentGridAverage * 0.9) {
    return {
      action: 'sell',
      target: 'current',
      gridName: currentGrid.gridName,
      profit: 0,
      sale: currentGridSellValue
    };
  }

  // Otherwise, don't sell
  return {
    action: 'keep',
    target: null,
    gridName: currentGrid.gridName,
    profit: 0,
    sale: 0
  };
}
