const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR, MIN_INTERVAL_MS } = require('../../config');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function getFileName(timestamp, isServer) {
  const date = new Date(timestamp);
  const datePart = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
  const suffix = isServer ? '_server' : '_local';
  return `${datePart}${suffix}.json`;
}

function calculateGridTopAverage(gridData, gridName) {
  const gridPrices = gridData
    .flatMap(entry => entry.grids.filter(g => g.gridName === gridName))
    .map(g => g.price)
    .sort((a, b) => b - a)
    .slice(0, 10);

  return gridPrices.length > 0
    ? gridPrices.reduce((sum, price) => sum + price, 0) / gridPrices.length
    : null;
}

async function saveData(dataEntry) {
  await ensureDataDir();
  const isServer = !!process.env.PUPPETEER_EXECUTABLE_PATH;
  const fileName = getFileName(dataEntry.timestamp, isServer);
  const filePath = path.join(DATA_DIR, fileName);

  let existingData = [];
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    existingData = JSON.parse(fileContent);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (existingData.length > 0) {
    const lastEntry = existingData[existingData.length - 1];
    const lastTimestamp = new Date(lastEntry.timestamp);
    const currentTimestamp = new Date(dataEntry.timestamp);

    if (currentTimestamp - lastTimestamp < MIN_INTERVAL_MS) {
      return false;
    }
  }

  existingData.push(dataEntry);
  await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
  return true;
}

async function loadData(days = 14) {
  const files = await fs.readdir(DATA_DIR);
  const now = new Date();
  const cutoffDate = new Date(now.setDate(now.getDate() - days));

  let allData = [];
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stats = await fs.stat(filePath);
    if (stats.mtime >= cutoffDate) {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileData = JSON.parse(fileContent);
      allData = allData.concat(fileData);
    }
  }

  // Sort the combined data by timestamp
  allData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Calculate top 10 averages for each grid
  const gridAverages = {};
  const uniqueGridIds = [...new Set(allData.flatMap(entry => entry.grids.map(g => g.gridName)))];

  uniqueGridIds.forEach(gridName => {
    gridAverages[gridName] = calculateGridTopAverage(allData, gridName);
  });

  console.log(`Loaded data for the last ${days} days.`);
  return { allData, gridAverages };
}

module.exports = {
  saveData,
  loadData
};