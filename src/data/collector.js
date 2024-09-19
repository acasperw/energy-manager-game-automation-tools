const { saveData, loadData } = require('../data/storage');

async function getStorageChargeData(page) {
  try {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/user.data.php');
      return await res.json();
    });

    const storageData = {};
    for (const [id, data] of Object.entries(response.storage)) {
      storageData[id] = {
        chargePercentage: (data.currentCharge / data.capacity) * 100,
        currentCharge: data.currentCharge,
        capacity: data.capacity
      };
    }
    return storageData;
  } catch (error) {
    console.error('Error fetching storage charge data:', error);
    return null;
  }
}

async function getEnergyPrices(page) {
  await page.waitForSelector('#production-outer', { visible: true });

  const storageChargeData = await getStorageChargeData(page);

  return page.evaluate((storageChargeData) => {
    const pricesMap = new Map();

    document.querySelectorAll('#production-outer .production-inner:not(.hidden)').forEach(div => {
      const gridIdClass = Array.from(div.classList).find(className => className.startsWith('container-grid-'));
      const gridId = gridIdClass ? gridIdClass.split('-').pop() : null;

      if (gridId) {
        const gridName = div.getAttribute('data-grid');
        const mwhValue = parseFloat(div.getAttribute('data-mwhvalue'));
        const demand = parseFloat(div.getAttribute('data-demand'));
        const charge = parseFloat(div.getAttribute('data-charged'));
        const isLowDemand = div.classList.contains('low-demand') || demand < 10000 || demand < charge;

        const storageId = div.id.split('-').pop();
        const chargePercentage = storageChargeData && storageChargeData[storageId] 
          ? storageChargeData[storageId].chargePercentage 
          : null;

        if (pricesMap.has(gridId)) {
          // If the grid already exists, accumulate the charge
          const existingGrid = pricesMap.get(gridId);
          existingGrid.charge += charge;
        } else {
          pricesMap.set(gridId, {
            gridName,
            mwhValue,
            demand,
            isLowDemand,
            charge,
            gridId,
            chargePercentage
          });
        }
      }
    });

    // Convert the map values to an array
    return Array.from(pricesMap.values());
  }, storageChargeData);
}

async function collectAndSaveEnergyData(page) {
  let energyPrices = await getEnergyPrices(page);
  const timestamp = new Date().toISOString();
  const dataEntry = {
    timestamp,
    grids: energyPrices.map(grid => ({
      gridId: grid.gridId,
      gridName: grid.gridName,
      price: grid.mwhValue,
      demand: grid.demand,
      isLowDemand: grid.isLowDemand
    }))
  };
  const saved = await saveData(dataEntry);
  if (saved) {
    console.log('Energy data collected and saved successfully.');
  } else {
    console.log('Skipped saving data: Less than minimum interval since last entry.');
  }
  // Load the last day's data and get grid averages
  const { gridAverages } = await loadData();
  return { energyPrices, gridAverages };
}

async function getEnergyOutputAmount(page) {
  try {
    const outputKw = await page.$eval('#headerOutput', el => el.getAttribute('output-kw'));
    return parseFloat(outputKw);
  } catch (error) {
    console.error('Error getting energy output amount:', error);
    return null;
  }
}

module.exports = { collectAndSaveEnergyData, getEnergyOutputAmount };