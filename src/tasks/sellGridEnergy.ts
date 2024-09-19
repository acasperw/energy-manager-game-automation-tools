import { Page } from "puppeteer";
import { EnergySalesProcess, GameSessionData } from "../types/interface";
import { ensureSidebarOpen } from "../automation/interactions";
import { getAllEligibleEnergyGrids, processEnergyGrid } from "../data/gridProcessing";
import { STORAGE_CHARGE_THRESHOLD_MIN } from "../config";

export async function sellGridEnergy(page: Page, data: GameSessionData): Promise<EnergySalesProcess> {

  let processedGrids = 0;
  let processedGridsResults = [];
  const eligibleGrids = getAllEligibleEnergyGrids(data.energyGrids);
  const salesEligibleGrids = data.energyGrids.filter(grid => grid.chargePercentage > STORAGE_CHARGE_THRESHOLD_MIN).filter(energyGrids => energyGrids.storages.some(storage => storage.type !== 'p2x'));

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
