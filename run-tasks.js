const { enableDisabledStoragePlants } = require('./enable-storage-plants');
const { sellEnergy } = require('./sell-energy');
// const { collectEnergyData } = require('./collect-data');
// const { analyzeData } = require('./analyze-data');

const FORTY_FIVE_MINUTES = 45 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_HOUR_HALF = 90 * 60 * 1000;
const TWO_HOURS = 2 * ONE_HOUR;
const THREE_HOURS = 3 * ONE_HOUR;
const FOUR_HOURS = 4 * ONE_HOUR;

const UTILITY_TASKS_INTERVAL = ONE_HOUR_HALF;
// const REGULAR_TASKS_INTERVAL = FOUR_HOURS
const SELL_ENERGY_INTERVAL = TWO_HOURS;
const RE_SCAN_INTERVAL = ONE_HOUR;

let isSellEnergyRunning = false;
let utilityTasksTimer = null;

async function runUtilityTasks() {
  if (!isSellEnergyRunning) {
    console.log('\nRunning enable-storage-plants...');
    const earliestSunrise = await enableDisabledStoragePlants();
    if (earliestSunrise) {
      scheduleNextUtilityRun(earliestSunrise);
    } else {
      utilityTasksTimer = setTimeout(runUtilityTasks, UTILITY_TASKS_INTERVAL);
    }
  }
}

function scheduleNextUtilityRun(earliestSunrise) {
  const now = new Date();
  let nextRun = new Date(earliestSunrise);
  nextRun.setMinutes(nextRun.getMinutes() + 20); // Add buffer

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  const delay = nextRun.getTime() - now.getTime();
  console.log(`Scheduling next daily utility run to start at ${nextRun.toLocaleString('en-GB')}`);
  if (utilityTasksTimer) {
    clearTimeout(utilityTasksTimer);
  }
  utilityTasksTimer = setTimeout(() => {
    runUtilityTasks();
    utilityTasksTimer = setInterval(runUtilityTasks, UTILITY_TASKS_INTERVAL);
  }, delay);
}

// async function runRegularTasks() {
//   if (!isSellEnergyRunning) {
//     console.log('Running collect & analyze data...');
//     await collectEnergyData();
//     await analyzeData();
//   }
// }

async function runSellEnergyTask() {
  if (isSellEnergyRunning) {
    console.log('Sell energy task is already running. Skipping this run.');
    return;
  }
  console.log('\nRunning sell-energy...');
  isSellEnergyRunning = true;
  try {
    const highUpcomingValueDetected = await sellEnergy();
    if (highUpcomingValueDetected) {
      console.log('High upcoming value detected. Scheduling in 1 hour.');
      setTimeout(runSellEnergyTask, RE_SCAN_INTERVAL);
    }
  } catch (error) {
    console.error('Error running sell-energy task:', error);
  } finally {
    isSellEnergyRunning = false;
  }
}

function startScheduler() {
  runUtilityTasks(); // Run immediately and schedule next run
  setInterval(runSellEnergyTask, SELL_ENERGY_INTERVAL);
}

startScheduler();

// Keep the process alive
setInterval(() => { }, 60000);

module.exports = { runUtilityTasks, runSellEnergyTask };