function analyzeTimeBasedPrices(data) {
  // Initialize arrays for each price band
  const topPrices = Array(24).fill().map(() => ({ sum: 0, count: 0 }));
  const middlePrices = Array(24).fill().map(() => ({ sum: 0, count: 0 }));
  const bottomPrices = Array(24).fill().map(() => ({ sum: 0, count: 0 }));
  const dailyPrices = Array(7).fill().map(() => ({ sum: 0, count: 0 }));

  // First, gather all prices to determine the thresholds
  const allPrices = [];
  data.forEach(entry => {
    entry.grids.forEach(grid => {
      if (!isNaN(grid.price) && grid.price !== null) {
        allPrices.push(grid.price);
      }
    });
  });

  // Sort prices and determine thresholds
  allPrices.sort((a, b) => b - a);
  const topThreshold = allPrices[Math.floor(allPrices.length * 0.1)]; // Top 10%
  const bottomThreshold = allPrices[Math.floor(allPrices.length * 0.9)]; // Bottom 10%

  // Now categorize and sum up the prices
  data.forEach(entry => {
    const date = new Date(entry.timestamp);
    const hour = date.getHours();
    const day = date.getDay();

    entry.grids.forEach(grid => {
      if (!isNaN(grid.price) && grid.price !== null) {
        if (grid.price >= topThreshold) {
          topPrices[hour].sum += grid.price;
          topPrices[hour].count++;
        } else if (grid.price <= bottomThreshold) {
          bottomPrices[hour].sum += grid.price;
          bottomPrices[hour].count++;
        } else {
          middlePrices[hour].sum += grid.price;
          middlePrices[hour].count++;
        }

        dailyPrices[day].sum += grid.price;
        dailyPrices[day].count++;
      }
    });
  });

  // Calculate averages
  const avgTopPrices = topPrices.map((hour, index) => ({
    hour: index,
    avgPrice: hour.count > 0 ? hour.sum / hour.count : null
  }));

  const avgMiddlePrices = middlePrices.map((hour, index) => ({
    hour: index,
    avgPrice: hour.count > 0 ? hour.sum / hour.count : null
  }));

  const avgBottomPrices = bottomPrices.map((hour, index) => ({
    hour: index,
    avgPrice: hour.count > 0 ? hour.sum / hour.count : null
  }));

  const avgDailyPrices = dailyPrices.map((day, index) => ({
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
    avgPrice: day.count > 0 ? day.sum / day.count : null
  }));

  return {
    hourlyPrices: {
      top: avgTopPrices,
      middle: avgMiddlePrices,
      bottom: avgBottomPrices
    },
    avgDailyPrices
  };
}

module.exports = { analyzeTimeBasedPrices };