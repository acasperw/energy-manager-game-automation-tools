const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { CHARTS_DIR } = require('../../config');
const fs = require('fs').promises;
const path = require('path');

async function saveChartImage(filename, image) {
  const folderPath = path.join(__dirname, '..', '..', CHARTS_DIR);
  await fs.mkdir(folderPath, { recursive: true });
  const filePath = path.join(folderPath, filename);
  await fs.writeFile(filePath, image);
  console.log(`Chart saved as ${filePath}`);
}

// Define a color palette
const colorPalette = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#EE7EAO', '#BCC07B', '#7BC225', '#E35586',
  '#9AB1B0'
];

// Function to get a random color from the palette
function getRandomColor() {
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
}

const plugin = {
  id: 'custom_canvas_background_color',
  beforeDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};


function getCommonChartOptions(title) {
  return {
    responsive: false,
    plugins: {
      title: { display: true, text: title }
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.1)' },
        ticks: { color: 'black' }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)' },
        ticks: { color: 'black' }
      }
    },
    layout: {
      padding: 20
    },

    borderColor: 'rgb(75, 192, 192)',
    color: 'black'
  };
}

async function generateTimeBasedPricesCharts(timeBasedPrices) {
  const { hourlyPrices, avgDailyPrices } = timeBasedPrices;
  const width = 1600;
  const height = 800;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  // Hourly prices chart
  const hourlyConfiguration = {
    type: 'line',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => i),
      datasets: [
        {
          label: 'Top 10% Prices',
          data: hourlyPrices.top.map(h => h.avgPrice),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Middle 80% Prices',
          data: hourlyPrices.middle.map(h => h.avgPrice),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Bottom 10% Prices',
          data: hourlyPrices.bottom.map(h => h.avgPrice),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: false,
          tension: 0.1
        }
      ]
    },
    plugins: [plugin],
    options: {
      ...getCommonChartOptions('Average Hourly Prices by Price Band'),
      scales: {
        ...getCommonChartOptions('').scales,
        x: { 
          ...getCommonChartOptions('').scales.x, 
          title: { display: true, text: 'Hour of Day' }
        },
        y: { ...getCommonChartOptions('').scales.y, title: { display: true, text: 'Price ($)' } }
      }
    }
  };

  const hourlyImage = await chartJSNodeCanvas.renderToBuffer(hourlyConfiguration);
  await saveChartImage('hourly_prices_chart.png', hourlyImage);

  // Daily prices chart
  const dailyConfiguration = {
    type: 'bar',
    data: {
      labels: avgDailyPrices.map(d => d.day),
      datasets: [{
        label: 'Average Price',
        data: avgDailyPrices.map(d => d.avgPrice),
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    plugins: [plugin],
    options: getCommonChartOptions('Average Daily Prices')
  };

  const dailyImage = await chartJSNodeCanvas.renderToBuffer(dailyConfiguration);
  await saveChartImage('daily_prices_chart.png', dailyImage);
}

async function generateGridPerformanceChart(gridPerformance) {
  const width = 1600;
  const height = 800;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const topGrids = Object.entries(gridPerformance)
    .sort(([, a], [, b]) => b.avgPrice - a.avgPrice)
    .slice(0, 10);

  const configuration = {
    type: 'bar',
    data: {
      labels: topGrids.map(([gridName]) => gridName),
      datasets: [{
        label: 'Average Price',
        data: topGrids.map(([, stats]) => stats.avgPrice),
        backgroundColor: topGrids.map(() => getRandomColor())
      }]
    },
    plugins: [plugin],
    options: {
      ...getCommonChartOptions('Top 10 Grids by Average Price'),
      scales: {
        ...getCommonChartOptions('').scales,
        y: { ...getCommonChartOptions('').scales.y, title: { display: true, text: 'Price ($)' } }
      }
    }
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  await saveChartImage('grid_performance_chart.png', image);
}

async function generatePriceOverTimeChart(gridPrices, timestamps) {
  const width = 1600;
  const height = 800;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const topGrids = Object.entries(gridPrices)
    .sort((a, b) => {
      const aAvg = a[1].reduce((sum, p) => sum + p.price, 0) / a[1].length;
      const bAvg = b[1].reduce((sum, p) => sum + p.price, 0) / b[1].length;
      return bAvg - aAvg;
    })
    .slice(0, 5)
    .map(([gridName]) => gridName);

  const datasets = topGrids.map(gridName => ({
    label: gridName,
    data: timestamps.map(timestamp => {
      const point = gridPrices[gridName].find(p => p.timestamp === timestamp);
      return point ? point.price : null;
    }),
    fill: false,
    borderColor: getRandomColor(),
  }));

  const configuration = {
    type: 'line',
    data: { labels: timestamps, datasets },
    plugins: [plugin],
    options: {
      ...getCommonChartOptions('Top 5 Grid Prices Over Time'),
      scales: {
        ...getCommonChartOptions('').scales,
        x: { ...getCommonChartOptions('').scales.x, title: { display: true, text: 'Time' } },
        y: { ...getCommonChartOptions('').scales.y, title: { display: true, text: 'Price ($)' } }
      }
    }
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  await saveChartImage('price_over_time_chart.png', image);
}

async function generateGridComparisonScatterPlot(gridPrices) {
  const width = 1600;
  const height = 800;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const gridStats = Object.entries(gridPrices).map(([gridName, prices]) => {
    const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
    const lowDemandPercentage = (prices.filter(p => p.isLowDemand).length / prices.length) * 100;
    return { gridName, avgPrice, lowDemandPercentage };
  });

  const configuration = {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Grids',
        data: gridStats.map(stat => ({
          x: stat.lowDemandPercentage,
          y: stat.avgPrice
        })),
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    plugins: [plugin],
    options: {
      ...getCommonChartOptions('Grid Comparison: Average Price vs Low Demand Percentage'),
      scales: {
        ...getCommonChartOptions('').scales,
        x: {
          ...getCommonChartOptions('').scales.x,
          title: { display: true, text: 'Low Demand Percentage' },
          min: 0,
          max: 100
        },
        y: {
          ...getCommonChartOptions('').scales.y,
          title: { display: true, text: 'Average Price ($)' }
        }
      },
      plugins: {
        ...getCommonChartOptions('').plugins,
        tooltip: {
          callbacks: {
            label: (context) => {
              const gridName = gridStats[context.dataIndex].gridName;
              return `${gridName}: (${context.parsed.x.toFixed(2)}%, $${context.parsed.y.toFixed(2)})`;
            }
          }
        }
      }
    }
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  await saveChartImage('grid_comparison_scatter.png', image);
}

async function generateDemandOverTimeChart(gridDemands, timestamps) {
  const width = 1600;
  const height = 800;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const topGrids = Object.entries(gridDemands)
    .sort((a, b) => {
      const aAvg = a[1].reduce((sum, d) => sum + d.demand, 0) / a[1].length;
      const bAvg = b[1].reduce((sum, d) => sum + d.demand, 0) / b[1].length;
      return bAvg - aAvg;
    })
    .slice(0, 5)
    .map(([gridName]) => gridName);

  const datasets = topGrids.map(gridName => ({
    label: gridName,
    data: timestamps.map(timestamp => {
      const point = gridDemands[gridName].find(d => d.timestamp === timestamp);
      return point ? point.demand : null;
    }),
    fill: false,
    borderColor: getRandomColor(),
  }));

  const configuration = {
    type: 'line',
    data: { labels: timestamps, datasets },
    plugins: [plugin],
    options: {
      ...getCommonChartOptions('Top 5 Grid Demands Over Time'),
      scales: {
        ...getCommonChartOptions('').scales,
        x: { ...getCommonChartOptions('').scales.x, title: { display: true, text: 'Time' } },
        y: { ...getCommonChartOptions('').scales.y, title: { display: true, text: 'Demand (MW)' } }
      }
    }
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  await saveChartImage('demand_over_time_chart.png', image);
}

async function generateCharts(analysisResults) {
  const { timeBasedPrices, gridPerformance, priceTrends, gridPrices, gridDemands, timestamps } = analysisResults;

  await generateTimeBasedPricesCharts(timeBasedPrices);
  await generateGridPerformanceChart(gridPerformance);
  await generatePriceOverTimeChart(gridPrices, timestamps);
  await generateGridComparisonScatterPlot(gridPrices);
  await generateDemandOverTimeChart(gridDemands, timestamps);
}

module.exports = { generateCharts };