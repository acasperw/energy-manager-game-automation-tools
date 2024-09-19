function analyzePriceTrends(data) {
  const gridTrends = {};

  // Sort data by timestamp
  data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  data.forEach(entry => {
    entry.grids.forEach(grid => {
      if (!gridTrends[grid.gridName]) {
        gridTrends[grid.gridName] = [];
      }
      gridTrends[grid.gridName].push({
        timestamp: entry.timestamp,
        price: grid.price
      });
    });
  });

  const trendResults = {};

  Object.entries(gridTrends).forEach(([gridName, prices]) => {
    const xValues = prices.map((_, index) => index);
    const yValues = prices.map(p => p.price);

    // Simple linear regression
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((total, x, i) => total + x * yValues[i], 0);
    const sumXX = xValues.reduce((total, x) => total + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    trendResults[gridName] = {
      slope: slope,
      intercept: intercept,
      trend: slope > 0 ? 'Increasing' : slope < 0 ? 'Decreasing' : 'Stable'
    };
  });

  return trendResults;
}

module.exports = { analyzePriceTrends };