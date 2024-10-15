import { gracefulShutdown, scheduleJob } from 'node-schedule';
import { EnergySalesProcess, GameSessionData, HydrogenSalesInfo, StorageAndPlantManagementResult, TaskDecisions, VesselInteractionReport } from './types/interface';
import { Page } from 'puppeteer';
import { closeBrowser, initializeBrowser, loginToEnergyManager } from './automation/browser';
import { fetchGameSessionData } from './data/collector';
import { makeDecisions } from './data/makeDecisions';
import { sellGridEnergy } from './tasks/sellGridEnergy';
import { sellGridHydrogen } from './tasks/sellGridHydrogen'
import { sessionSummaryReport } from './tasks/sessionSummaryReport';
import { buyC02Quotas } from './tasks/buyC02Quotas';
import { withRetry } from './utils/helpers';
import { storeGridHydrogen } from './tasks/storeGridHydrogen';
import { doResearch } from './tasks/doResearch';
import { vesselInteractions } from './tasks/vessels';
import { handleHackScenario } from './tasks/handleHackScenario';
import { buyCommodities } from './tasks/buyCommodities';
import { storageAndPlantManagement } from './tasks/storageAndPlantManagement';

export async function executeTasks(decisions: TaskDecisions, data: GameSessionData, page: Page): Promise<{
  energySalesInfo: EnergySalesProcess,
  hydrogenSalesTotal: HydrogenSalesInfo,
  co2QuotasBought: number,
  commoditiesBought: Record<string, number>,
  storeHydrogen: boolean
}> {
  let energySalesInfo: EnergySalesProcess = { processedGrids: 0, processedGridsResults: [] };
  let hydrogenSalesTotal: HydrogenSalesInfo = { sale: 0, includingSilo: false };
  let storagePlantManagementResult = {} as StorageAndPlantManagementResult;
  let co2QuotasBought = 0;
  let commoditiesBought: Record<string, number> = {};
  let storeHydrogen = false;
  let didResearch = 0;
  let vesselInteractionsReport: VesselInteractionReport[] = [];

  const currentTime = new Date().toLocaleString();
  console.log(`\n\n-------- Session summary report -------- ${currentTime} --------`);

  if (decisions.buyCo2Quotas) {
    co2QuotasBought = await buyC02Quotas(page, data);
  }

  if (decisions.buyCommodities) {
    commoditiesBought = await buyCommodities(page, data);
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

  if (decisions.manageStoragesPlants) {
    storagePlantManagementResult = await storageAndPlantManagement(page, data, decisions);
  }

  if (decisions.doResearch) {
    didResearch = await doResearch(page, data);
  }

  if (decisions.vesselRequireAttention) {
    vesselInteractionsReport = await vesselInteractions(page, data);
  }

  await sessionSummaryReport(
    data,
    decisions,
    energySalesInfo,
    hydrogenSalesTotal,
    co2QuotasBought,
    storagePlantManagementResult,
    commoditiesBought,
    storeHydrogen,
    didResearch,
    vesselInteractionsReport
  );

  // Return the results for further processing
  return {
    energySalesInfo,
    hydrogenSalesTotal,
    co2QuotasBought,
    commoditiesBought,
    storeHydrogen
  };
}

const HYDROGEN_RERUN_DELAY = 120000; // 2 minutes in milliseconds
const MAX_HYDROGEN_RERUNS = 1; // Maximum number of consecutive hydrogen-related reruns

function scheduleRerun(rerunTime: number, reason: string, currentRerunCount: number) {
  const delay = rerunTime - Date.now();
  console.log(`Scheduling rerun in ${delay / 1000} seconds. Reason: ${reason}\n`);
  scheduleJob(new Date(rerunTime), () => {
    mainTask(reason === "Hydrogen activity" ? currentRerunCount + 1 : 0).catch(error => {
      console.error(`Failed to execute scheduled mainTask (${reason}):`, error);
    });
  });
}

async function handleTaskExecution(page: Page, data: GameSessionData): Promise<boolean> {
  const decisions: TaskDecisions = makeDecisions(data);
  const results = await executeTasks(decisions, data, page);
  if (results.hydrogenSalesTotal.includingSilo || results.storeHydrogen) {
    console.log(`\nHydrogen silo ${results.hydrogenSalesTotal.includingSilo ? 'sale' : 'transfer'} detected.`);
    return true;
  }
  return false;
}

export async function mainTask(currentRerunCount: number = 0) {
  let page: Page | null = null;
  await withRetry(async () => {
    console.time('Session');
    try {
      const { page: newPage } = await initializeBrowser();
      page = newPage;
      await loginToEnergyManager(page);
      let data = await fetchGameSessionData(page);
      if (data.userIsUnderHack) {
        await handleHackScenario(page);
        data = await fetchGameSessionData(page);
      }

      // Execute tasks and handle reruns if necessary
      const requiresHydrogenRerun = await handleTaskExecution(page, data);
      if (data.rerunTime && data.rerunTime > Date.now()) {
        scheduleRerun(data.rerunTime, "Scheduled rerun", 0);
      } else if (requiresHydrogenRerun && currentRerunCount < MAX_HYDROGEN_RERUNS) {
        const rerunTime = Date.now() + HYDROGEN_RERUN_DELAY;
        scheduleRerun(rerunTime, "Hydrogen activity", currentRerunCount);
      }

    } finally {
      if (page) {
        await page.close();
      }
      console.timeEnd('Session');
    }
  }, 2, 120000, async (error, attempt) => { await closeBrowser() });
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
