const { initializeBrowser, loginToEnergyManager } = require('./src/automation/browser');
const { getTopEnergyPrices, processChargedGrids } = require('./src/data/gridProcessing');
const { collectAndSaveEnergyData } = require('./src/data/collector');
const { formatEnergy, formatCurrency } = require('./src/utils/helpers');
const { TOP_PRICES_COUNT } = require('./config');
const { ensureSidebarOpen } = require('./src/automation/interactions');

async function sellEnergy() {
  console.time("sellEnergy_Process_Time");
  const { browser, page } = await initializeBrowser();

  try {
    await loginToEnergyManager(page);
    await ensureSidebarOpen(page);

    const { energyPrices, gridAverages } = await collectAndSaveEnergyData(page);

    const topPrices = getTopEnergyPrices(energyPrices);

    console.log(`\nTop ${TOP_PRICES_COUNT} grid prices:`);
    console.log(topPrices.map(grid => `${grid.gridName}: ${formatCurrency(grid.mwhValue)}`).join('\n'));

    console.log('\nGrids with highest demand:');
    const demandGrids = energyPrices.sort((a, b) => b.demand - a.demand).slice(0, TOP_PRICES_COUNT);
    console.log(demandGrids.map(grid => `${grid.gridName}: ${formatEnergy(grid.demand)} in ${grid.isLowDemand ? 'low' : 'high'} demand`).join('\n'));

    const { processedGrids, soldGrids, totalAdditionalProfit, totalSoldValue, highUpcomingValueDetected } = await processChargedGrids(page, energyPrices, gridAverages);

    console.log('\nSummary:');
    console.log(`Total sales: ${formatCurrency(totalSoldValue, false)} in ${soldGrids} grids out of ${processedGrids}`);
    console.log(`Additional profit from optimizations: ${formatCurrency(totalAdditionalProfit, false)}`);

    return highUpcomingValueDetected;
  } catch (error) {
    console.error('An error occurred:', error);
    return false;
  } finally {
    await browser.close();
    console.timeEnd("sellEnergy_Process_Time");
  }
}

module.exports = { sellEnergy };

// Allow running as a standalone script
if (require.main === module) {
  sellEnergy().catch(console.error);
}
