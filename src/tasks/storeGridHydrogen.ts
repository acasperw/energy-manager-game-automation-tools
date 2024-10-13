import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { postApiData } from "../utils/api-requests";

export async function storeGridHydrogen(page: Page, data: GameSessionData): Promise<boolean> {
  let didStoreHydrogen = false;

  if (data.hydrogen.currentHydrogenStorageCharge > 0 && data.hydrogen.hydrogenSiloHolding < data.hydrogen.hydrogenSiloCapacity) {
    try {
      await postApiData(page, '/hydrogen-exchange-sell.php?mode=silo&units=' + data.hydrogen.p2xStorageIds.join(','));
      didStoreHydrogen = true;
    } catch (error) {
      console.error('Error selling grid hydrogen:', error);
    }
  }
  return didStoreHydrogen;

}
