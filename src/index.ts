import { scheduleJob } from 'node-schedule';
import { EnergySalesProcess, GameSessionData, HydrogenSalesInfo, TaskDecisions } from './types/interface';
import { Page } from 'puppeteer';
import { initializeBrowser, loginToEnergyManager } from './automation/browser';
import { fetchGameSessionData } from './data/collector';
import { makeDecisions } from './data/makeDecisions';
import { sellGridEnergy } from './tasks/sellGridEnergy';
import { sellGridHydrogen } from './tasks/sellGridHydrogen';
import { enableStoragesPlants } from './tasks/enableStoragesPlants';
import { sessionSummaryReport } from './tasks/sessionSummaryReport';
import { buyC02Quotas } from './tasks/buyC02Quotas';

export async function executeTasks(decisions: TaskDecisions, data: GameSessionData, page: Page) {
  let energySalesInfo: EnergySalesProcess = { processedGrids: 0, processedGridsResults: [] };
  let hydrogenSalesTotal: HydrogenSalesInfo = { sale: 0, includingSilo: false };
  let co2QuotasBought = 0;
  let enabledPlants = 0;

  if (decisions.sellEnergy) {

    // // TEMP INFO FOR TESTING
    // console.log('Energy grids in isLowDemand mode:');
    // const gridsInLowDemand = data.energyGrids.filter(grid => grid.isLowDemand);
    // gridsInLowDemand.sort((a, b) => a.mwhValue - b.mwhValue);
    // console.log(gridsInLowDemand.slice(0, 15));


    // const gridsWithCharge = data.energyGrids.filter(grid => grid.totalCurrentCharge > 0);
    // console.log('Energy grids with charge:');
    // gridsWithCharge.sort((a, b) => a.mwhValue - b.mwhValue);
    // console.log(gridsWithCharge.slice(0, 15));
    // // END TEMP INFO

    energySalesInfo = await sellGridEnergy(page, data);
  }

  if (decisions.sellHydrogen) {
    hydrogenSalesTotal = await sellGridHydrogen(page);
  }

  if (decisions.buyCo2Quotas) {
    co2QuotasBought = await buyC02Quotas(page, data);
  }

  if (decisions.enableStoragesPlants) {
    enabledPlants = await enableStoragesPlants(page, data);
  }

  await sessionSummaryReport(data, decisions, energySalesInfo, hydrogenSalesTotal, co2QuotasBought, enabledPlants);
}

export async function mainTask() {
  console.time('Session');
  const { browser, page } = await initializeBrowser();
  try {
    await loginToEnergyManager(page);
    const data = await fetchGameSessionData(page);
    const decisions: TaskDecisions = makeDecisions(data);
    await executeTasks(decisions, data, page);
  } catch (error) {
    console.error('An error occurred during the main task:', error);
  } finally {
    await browser.close();
    console.timeEnd('Session');
  }
}

function startScheduler() {
  mainTask();
  scheduleJob('0 * * * *', mainTask);
}

startScheduler();
