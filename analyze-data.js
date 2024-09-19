const { loadData } = require('./src/data/storage');
const { analyzeTimeBasedPrices } = require('./src/analysis/timeBasedAnalysis');
const { analyzeGridPerformance } = require('./src/analysis/gridPerformanceAnalysis');
const { analyzePriceTrends } = require('./src/analysis/priceTrendAnalysis');
const { generateCharts } = require('./src/visualization/chartGenerator');

function processEnergyData(data) {
  const gridPrices = {};
  const gridDemands = {};
  const timestamps = new Set();

  data.forEach(entry => {
    timestamps.add(entry.timestamp);
    entry.grids.forEach(grid => {
      if (!gridPrices[grid.gridName]) {
        gridPrices[grid.gridName] = [];
        gridDemands[grid.gridName] = [];
      }
      gridPrices[grid.gridName].push({
        timestamp: entry.timestamp,
        price: grid.price,
        isLowDemand: grid.isLowDemand
      });
      gridDemands[grid.gridName].push({
        timestamp: entry.timestamp,
        demand: grid.demand
      });
    });
  });

  return { gridPrices, gridDemands, timestamps: Array.from(timestamps).sort() };
}

async function analyzeData() {
  try {
    const { allData } = await loadData();
    const { gridPrices, gridDemands, timestamps } = processEnergyData(allData);

    const timeBasedPrices = analyzeTimeBasedPrices(allData);

    console.log('\nGrid Performance Analysis:');
    const gridPerformance = analyzeGridPerformance(allData);

    const priceTrends = analyzePriceTrends(allData);

    if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
      // Generate charts
      await generateCharts({
        timeBasedPrices,
        gridPerformance,
        priceTrends,
        gridPrices,
        gridDemands,
        timestamps
      });
      console.log('\nAnalysis complete. Charts have been generated.');
    }
  } catch (error) {
    console.error('An error occurred during analysis:', error);
  }
}

module.exports = { analyzeData };

// Allow running as a standalone script
if (require.main === module) {
  analyzeData().catch(console.error);
}