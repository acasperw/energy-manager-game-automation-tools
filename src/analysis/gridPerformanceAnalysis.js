function analyzeGridPerformance(data) {
  const gridPerformance = {};

  // Aggregate data for each grid
  data.forEach(entry => {
    entry.grids.forEach(grid => {
      if (!gridPerformance[grid.gridName]) {
        gridPerformance[grid.gridName] = {
          prices: [],
          lowDemandCount: 0,
          totalCount: 0
        };
      }
      gridPerformance[grid.gridName].prices.push(grid.price);
      gridPerformance[grid.gridName].lowDemandCount += grid.isLowDemand ? 1 : 0;
      gridPerformance[grid.gridName].totalCount++;
    });
  });

  // Calculate statistics for each grid
  Object.keys(gridPerformance).forEach(gridName => {
    const grid = gridPerformance[gridName];
    grid.avgPrice = grid.prices.reduce((sum, price) => sum + price, 0) / grid.prices.length;
    grid.maxPrice = Math.max(...grid.prices);
    grid.minPrice = Math.min(...grid.prices);
    grid.lowDemandPercentage = (grid.lowDemandCount / grid.totalCount) * 100;
  });

  // Sort grids by average price (descending)
  const sortedGrids = Object.entries(gridPerformance)
    .sort(([, a], [, b]) => b.avgPrice - a.avgPrice);

  // Function to print grid stats
  const printGridStats = (grids, title) => {
    console.log(title);
    grids.forEach(([gridName, stats], index) => {
      console.log(`${index + 1}. ${gridName}:`);
      console.log(`   Average Price: $${stats.avgPrice.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);
      console.log(`   Max Price: $${stats.maxPrice.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);
      console.log(`   Min Price: $${stats.minPrice.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);
      console.log(`   Low Demand: ${stats.lowDemandPercentage.toLocaleString('en-GB', { maximumFractionDigits: 2 })}% of the time`);
    });
  };

  // Print top 5 performing grids
  printGridStats(sortedGrids.slice(0, 5), 'Top 5 Performing Grids:');

  // Print worst 5 performing grids
  console.log('\n');
  printGridStats(sortedGrids.slice(-5).reverse(), 'Worst 5 Performing Grids:');

  return gridPerformance;
}

module.exports = { analyzeGridPerformance };