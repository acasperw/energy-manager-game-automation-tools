import { gracefulShutdown, scheduleJob } from 'node-schedule';
import { RefuelEnableStoragesPlantsResult, EnergySalesProcess, GameSessionData, HydrogenSalesInfo, ReEnablePlantsResult, TaskDecisions } from './types/interface';
import { Page } from 'puppeteer';
import { closeBrowser, initializeBrowser, loginToEnergyManager } from './automation/browser';
import { fetchGameSessionData } from './data/collector';
import { makeDecisions } from './data/makeDecisions';
import { sellGridEnergy } from './tasks/sellGridEnergy';
import { sellGridHydrogen } from './tasks/sellGridHydrogen'
import { sessionSummaryReport } from './tasks/sessionSummaryReport';
import { buyC02Quotas } from './tasks/buyC02Quotas';
import { reEnableSolarPlants } from './tasks/reEnableSolarPlants';
import { buyOil } from './tasks/buyOil';
import { delay, withRetry } from './utils/helpers';
import { refuelEnableStoragesPlants } from './tasks/enableStoragesPlants';
import { storeGridHydrogen } from './tasks/storeGridHydrogen';

export async function executeTasks(decisions: TaskDecisions, data: GameSessionData, page: Page): Promise<{
  energySalesInfo: EnergySalesProcess,
  hydrogenSalesTotal: HydrogenSalesInfo,
  enabledPlants: RefuelEnableStoragesPlantsResult,
  reenabledSolarPlants: ReEnablePlantsResult,
  co2QuotasBought: number,
  oilBought: number,
  uraniumBought: number,
  storeHydrogen: boolean
}> {
  let energySalesInfo: EnergySalesProcess = { processedGrids: 0, processedGridsResults: [] };
  let hydrogenSalesTotal: HydrogenSalesInfo = { sale: 0, includingSilo: false };
  let enabledPlants: RefuelEnableStoragesPlantsResult = { totalEnabled: 0, totalSkipped: 0, totalOutOfFuel: 0, didRefuel: false, pctRefueled: 0, totalDisabled: 0 };
  let reenabledSolarPlants: ReEnablePlantsResult = { enabledPlants: 0, kwEnergyBefore: 0, kwEnergyAfter: 0 };
  let co2QuotasBought = 0;
  let oilBought = 0;
  let uraniumBought = 0;
  let storeHydrogen = false;

  console.log('\n\n--------- Session summary report --------');

  if (decisions.buyCo2Quotas) {
    co2QuotasBought = await buyC02Quotas(page, data);
  }

  if (decisions.buyOil) {
    oilBought = await buyOil(page, data);
  }

  if (decisions.sellEnergy) {
    energySalesInfo = await sellGridEnergy(page, data);
  }

  if (decisions.storeHydrogen) {
    storeHydrogen = await storeGridHydrogen(page, data);
  }

  if (decisions.sellHydrogen || decisions.sellHydrogenSilo) {
    hydrogenSalesTotal = await sellGridHydrogen(page, data, decisions);
  }

  if (decisions.enableStoragesPlants) {
    enabledPlants = await refuelEnableStoragesPlants(page, data);
  }

  if (decisions.reenableSolarPlants) {
    reenabledSolarPlants = await reEnableSolarPlants(page, data, decisions);
  }

  await sessionSummaryReport(
    data,
    decisions,
    energySalesInfo,
    hydrogenSalesTotal,
    co2QuotasBought,
    enabledPlants,
    reenabledSolarPlants,
    oilBought,
    uraniumBought,
    storeHydrogen
  );

  // Return the results for further processing
  return {
    energySalesInfo,
    hydrogenSalesTotal,
    enabledPlants,
    reenabledSolarPlants,
    co2QuotasBought,
    oilBought,
    uraniumBought,
    storeHydrogen
  };
}

export async function mainTask() {
  await withRetry(async () => {
    console.time('Session');
    const { page } = await initializeBrowser();
    try {
      await loginToEnergyManager(page);
      let data = await fetchGameSessionData(page);
      let decisions: TaskDecisions = makeDecisions(data);
      let results = await executeTasks(decisions, data, page);

      // If a hydrogen silo sale or transfer was detected, wait for 2 mins before re-executing tasks to allow continuation of storage
      if (results.hydrogenSalesTotal.includingSilo || results.storeHydrogen) {
        console.log(`\nHydrogen silo ${results.hydrogenSalesTotal.includingSilo ? 'sale' : 'transfer'} detected. Waiting for 2 mins before re-executing tasks.\n`);
        await delay(120000);
        data = await fetchGameSessionData(page);
        decisions = makeDecisions(data);
        await executeTasks(decisions, data, page);
      }
    } finally {
      await closeBrowser();
      console.timeEnd('Session');
    }
  }, 2, 120000);
}

function startScheduler() {
  mainTask().catch(error => { console.error('Failed to execute mainTask after retries:', error); });

  scheduleJob('10 0 * * * *', () => {
    mainTask().catch(error => { console.error('Failed to execute mainTask after retries:', error); });
  });
}

async function mainGracefulShutdown() {
  console.log('Initiating graceful shutdown...');
  try {
    await gracefulShutdown();
    await closeBrowser();
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
}

// Handle termination signals
process.on('SIGINT', async function () {
  console.log('SIGINT received.');
  await mainGracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async function () {
  console.log('SIGTERM received.');
  await mainGracefulShutdown();
  process.exit(0);
});

startScheduler();
