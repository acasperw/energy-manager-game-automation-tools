import { Page } from "puppeteer";
import { GameSessionData, HydrogenSalesInfo, TaskDecisions } from "../types/interface";
import { postApiData } from "../utils/api-requests";

export async function sellGridHydrogen(page: Page, data: GameSessionData, decisions: TaskDecisions): Promise<HydrogenSalesInfo> {
  let totalSales = 0;
  let saleIncludesSilo = false;

  // Sell main hydrogen
  if (decisions.sellHydrogen && data.hydrogen.sellValue > 0) {
    try {
      await postApiData(page, '/hydrogen-exchange-sell.php?units=' + data.hydrogen.p2xStorageIds.join(','));
      totalSales += data.hydrogen.sellValue;
    } catch (error) {
      console.error('Error selling grid hydrogen:', error);
    }
  }

  // Check for silo and sell if available
  if (decisions.sellHydrogenSilo && data.hydrogen.siloSellValue > 0) {
    try {
      await postApiData(page, 'hydrogen-exchange.php?mode=siloSale');
      totalSales += data.hydrogen.siloSellValue;
      saleIncludesSilo = true;
    } catch (error) {
      console.error('Error selling grid hydrogen (Silo):', error);
    }
  }

  return { sale: totalSales, includingSilo: saleIncludesSilo };
}
