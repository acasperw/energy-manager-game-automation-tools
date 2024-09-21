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
import { reEnableSolarPlants } from './tasks/reEnableSolarPlants';

export async function executeTasks(decisions: TaskDecisions, data: GameSessionData, page: Page) {
  let energySalesInfo: EnergySalesProcess = { processedGrids: 0, processedGridsResults: [] };
  let hydrogenSalesTotal: HydrogenSalesInfo = { sale: 0, includingSilo: false };
  let co2QuotasBought = 0;
  let enabledPlants = 0;
  let reenabledSolarPlants = { enabledPlants: 0, kwEnergyBefore: 0, kwEnergyAfter: 0 };

  if (decisions.sellEnergy) {
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

  if (decisions.reenableSolarPlants) {
    reenabledSolarPlants = await reEnableSolarPlants(page, data, decisions);
  }

  await sessionSummaryReport(data, decisions, energySalesInfo, hydrogenSalesTotal, co2QuotasBought, enabledPlants, reenabledSolarPlants);
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
