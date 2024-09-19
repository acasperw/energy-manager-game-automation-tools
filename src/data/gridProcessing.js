const { TOP_PRICES_COUNT, ARTIFICIAL_SLOWDOWN, CHARGE_THRESHOLD } = require('../../config');
const { delay, formatEnergy, formatCurrency } = require('../utils/helpers');
const { hideSalesResultPopup, clickDollarSignAndWaitForModal, openAdvancedTab, ensureSidebarOpen } = require('../automation/interactions');
const { captureScreenshot } = require('../automation/browser');

function getTopEnergyPrices(prices, count = TOP_PRICES_COUNT) {
  return prices
    .filter(grid => !grid.isLowDemand)
    .sort((a, b) => b.mwhValue - a.mwhValue)
    .slice(0, count);
}

function getAllEligibleGrids(prices) {
  return prices
    .filter(grid => !grid.isLowDemand)
    .sort((a, b) => b.mwhValue - a.mwhValue);
}

async function processChargedGrids(page, energyPrices, gridAverages) {
  await delay(1000 * ARTIFICIAL_SLOWDOWN);
  let totalAdditionalProfit = 0;
  let totalSoldValue = 0;
  let processedGrids = 0;
  let soldGrids = 0;
  let highUpcomingValueDetected = false;

  const eligibleGrids = getAllEligibleGrids(energyPrices);

  for (const grid of energyPrices) {
    if (grid.chargePercentage >= 85) {
      // const eligibleGridsWithDemandGreaterThanCurrentCharge = eligibleGrids.filter(eligibleGrid => eligibleGrid.demand * 2 >= grid.charge);
      console.log(`\nProcessing grid ${grid.gridName} with charge ${formatEnergy(grid.charge)} (${grid.chargePercentage.toFixed(2)}%)`);
      const result = await processGrid(page, grid, eligibleGrids, gridAverages);

      processedGrids++;
      if (result.action === 'sold') {
        soldGrids++;
        totalSoldValue += result.sale;
        totalAdditionalProfit += result.additionalProfit;
        console.log(`Sold ${grid.gridName} ${grid.gridName !== result.soldTo ? `to ${result.soldTo} ` : ''}for ${formatCurrency(result.sale, false)}. Additional profit: ${formatCurrency(result.additionalProfit, false)}`);
      }
      if (result.highUpcomingValue) {
        highUpcomingValueDetected = true;
      }
    }
  }

  if (processedGrids === 0) {
    console.log("No grids met the minimum charge percentage threshold for processing.");
  }

  return { processedGrids, soldGrids, totalSoldValue, totalAdditionalProfit, highUpcomingValueDetected };
}

async function clickGridAndWaitForDetails(page, grid) {
  await delay(500 * ARTIFICIAL_SLOWDOWN);
  await page.waitForSelector('#production-outer', { visible: true });
  const gridSelector = `#production-outer .production-inner[data-grid="${grid.gridName}"]:not(.hidden) .col-12:not(.pane-discharging):not(.hidden) .col-9.p-row-outer.p-row.pointer:not(.p-row-outer-discharge)`;

  try {
    await page.waitForSelector(gridSelector);
    await page.click(gridSelector);
    await page.waitForFunction(
      (gridName) => {
        const detailsPane = document.querySelector('#details-pane');
        return detailsPane.style.display === 'block' && detailsPane.textContent.includes(gridName);
      },
      {},
      grid.gridName
    );
    await delay(100 * ARTIFICIAL_SLOWDOWN);
    return true;
  } catch (error) {
    console.log(`Error processing grid ${grid.gridName}: ${error.message}`);
    await captureScreenshot(page, `error-processing-grid-${grid.gridName}.png`);
    return false;
  }
}

async function getAdvancedTabRows(page) {
  return page.evaluate(() => {

    function convertCurrencyToNumber(currencyString) {
      let numericString = currencyString.replace(/[\$,]/g, '');
      let numericValue = parseInt(numericString, 10);
      return numericValue;
    }

    const rows = [];
    const allDivs = document.querySelectorAll('#advanced-tab .row.g-0.mt-1 > div');

    for (let i = 0; i < allDivs.length; i += 3) {
      const gridName = allDivs[i].textContent.trim();
      const mwhValue = parseFloat(allDivs[i + 1].textContent.trim().replace('$', '').replace(',', '').split(' ')[0]);
      const sellValue = convertCurrencyToNumber(allDivs[i + 2].querySelector('span.fw-bold').textContent.trim());

      rows.push({
        gridName: gridName,
        mwhValue: mwhValue,
        sellValue: sellValue,
        buttonSelector: `#advanced-tab .row.g-0.mt-1 > div:nth-child(${i + 3}) button`
      });
    }
    return rows;
  });
}

async function findBestSellingOption(advancedTabRows, currentGrid, eligibleGrids, gridAverages) {
  const eligibleOptions = advancedTabRows.filter(row =>
    eligibleGrids.some(grid => grid.gridName === row.gridName)
  );

  if (eligibleOptions.length === 0) {
    console.log('No eligible selling options found in advanced tab');
    return null;
  }

  const currentGridSellValue = (currentGrid.mwhValue * currentGrid.charge) / 1000;

  const bestAlternative = eligibleOptions.reduce((best, current) => {
    const alternativeGridAverage = gridAverages[current.gridName] || current.mwhValue;
    const alternativeSellValue = (current.mwhValue * currentGrid.charge * 0.9) / 1000;

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
    return bestAlternative;
  } else {
    // console.log('Current grid is better or not significantly worse');
    return null;
  }
}

async function extractUpcomingValue(page) {
  return page.evaluate(() => {
    const upcomingValueLabel = Array.from(document.querySelectorAll('#details-pane div')).find(el => el.textContent.trim() === 'Upcoming value');
    if (upcomingValueLabel) {
      const valueElement = upcomingValueLabel.nextElementSibling;
      if (valueElement) {
        const match = valueElement.textContent.match(/\$\s*([\d,]+)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : null;
      }
    }
    return null;
  });
}

async function checkForHydrogen(page) {
  try {
    await page.waitForSelector('#hydrogen-value-per-kg', { timeout: 2000 });
    const hydrogenValue = await page.evaluate(() => {
      const element = document.querySelector('#hydrogen-value-per-kg');
      return element ? parseFloat(element.textContent.replace(/[^0-9.]/g, '')) : 0;
    });
    if (hydrogenValue > 50) {
      await page.click('#main-hydrogen-sell-btn');
      return true;
    }
  } catch (error) { }
  return false;
}

function determineSellAction(currentGrid, bestAlternative, gridAverages) {
  const currentGridSellValue = (currentGrid.mwhValue * currentGrid.charge) / 1000;
  const currentGridAverage = gridAverages[currentGrid.gridName] || currentGrid.mwhValue;

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

async function processGrid(page, currentGrid, eligibleGrids, gridAverages) {
  await hideSalesResultPopup(page);
  await ensureSidebarOpen(page);

  const gridClickable = await clickGridAndWaitForDetails(page, currentGrid);
  if (!gridClickable) {
    return { sale: 0, additionalProfit: 0, action: 'skipped' };
  }

  // Extract the upcoming value
  const upcomingMwhValue = await extractUpcomingValue(page);

  // Check if the upcoming value is higher than any of the top prices
  const maxTopMwhValue = Math.max(...eligibleGrids.map(g => gridAverages[g.gridName] || g.mwhValue * 0.8)); // Apply 10% fee and buffer
  if (upcomingMwhValue > maxTopMwhValue) {
    console.log(`Keeping grid ${currentGrid.gridName} as upcoming value (${formatCurrency(upcomingMwhValue)}) is higher than max top price (${formatCurrency(maxTopMwhValue)})`);
    return { sale: 0, additionalProfit: 0, action: 'kept', highUpcomingValue: true };
  }

  await clickDollarSignAndWaitForModal(page);

  const hydrogenSold = await checkForHydrogen(page);
  if (hydrogenSold) {
    await hideSalesResultPopup(page);
    await page.click('#main-modal-container .opa-light.text-center.intro-disable');
    await page.waitForSelector('#main-modal-container', { hidden: true });
    return { sale: 0, additionalProfit: 0, action: 'sold' };
  }

  await openAdvancedTab(page);
  const advancedTabRows = await getAdvancedTabRows(page);

  const bestOption = await findBestSellingOption(advancedTabRows, currentGrid, eligibleGrids, gridAverages);
  const sellDecision = determineSellAction(currentGrid, bestOption, gridAverages);

  switch (sellDecision.action) {
    case 'sell':
      if (sellDecision.target === 'alternative') {
        await page.click(bestOption.buttonSelector);
      } else {
        await page.click('#sell-to-grid-btn');
      }
      await hideSalesResultPopup(page);
      break;
    case 'keep':
      console.log(`Keeping ${currentGrid.gridName} as conditions are not optimal for selling`);
      break;
  }

  await page.click('#main-modal-container .opa-light.text-center.intro-disable');
  await page.waitForSelector('#main-modal-container', { hidden: true });

  return {
    sale: sellDecision.sale,
    additionalProfit: sellDecision.profit,
    action: sellDecision.action === 'keep' ? 'kept' : 'sold',
    soldTo: sellDecision.target === 'alternative' ? sellDecision.gridName : (sellDecision.action === 'sell' ? currentGrid.gridName : null),
    highUpcomingValue: false
  };
}

module.exports = {
  getTopEnergyPrices,
  processGrid,
  processChargedGrids
};