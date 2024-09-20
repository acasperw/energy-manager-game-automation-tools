import { Page } from "puppeteer";
import { EnergySalesProcess, GameSessionData } from "../types/interface";
import { ensureSidebarOpen } from "../automation/interactions";
import { processEnergyGrid } from "../data/gridProcessing";
import { STORAGE_CHARGE_THRESHOLD_MIN } from "../config";
import { filterGridsByStorageType, getAllEligibleEnergyGridsWeCanSellTo, isGridChargeAboveThreshold } from "../utils/grid-utils";

export async function sellGridEnergy(page: Page, data: GameSessionData): Promise<EnergySalesProcess> {
  let processedGrids = 0;
  let processedGridsResults = [];

  // All grids we can sell from
  const nonP2xGrids = filterGridsByStorageType(data.energyGrids, 'non-p2x');
  const salesEligibleGrids = nonP2xGrids.filter(grid => isGridChargeAboveThreshold(grid, 'non-p2x', STORAGE_CHARGE_THRESHOLD_MIN));

  // All grids that could be sold to
  const eligibleGrids = getAllEligibleEnergyGridsWeCanSellTo(data.energyGrids);

  await ensureSidebarOpen(page);

  for (const grid of salesEligibleGrids) {
    const result = await processEnergyGrid(page, grid, eligibleGrids);
    processedGridsResults.push(result);
    processedGrids++;
  }

  return {
    processedGrids: processedGrids,
    processedGridsResults
  };
}
