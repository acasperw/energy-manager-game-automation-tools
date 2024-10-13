import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { postApiData } from "../utils/api-requests";
import { getSliderValuesFromString } from "../utils/browser-data-helpers";

export async function buyOil(page: Page, data: GameSessionData): Promise<number> {
  let oilBought = 0;
  try {
    const commoditiesBuyOilHtml = await postApiData<string>(page, `/commodities.php?type=oil&hideNavbar=true`);
    const { maxAmountPurchasable } = parseCommoditiesBuyOilHtml(commoditiesBuyOilHtml);
    const theoreticalMaxAmountPurchasable = Math.floor(data.userMoney / data.oilBuyPrice);
    const oilToBuy = Math.min(maxAmountPurchasable, theoreticalMaxAmountPurchasable);
    if (oilToBuy > 0) {
      await postApiData<string>(page, `/api/commodities/buy.php?type=oil&amount=${oilToBuy}`);
      return oilToBuy;
    }
    return oilBought;
  } catch (error) {
    console.error('Error buying Oil:', error);
    return oilBought;
  }
}

function parseCommoditiesBuyOilHtml(html: string): { maxAmountPurchasable: number } {
  const maxAmountPurchasable = getSliderValuesFromString(html).max;
  return { maxAmountPurchasable };
}
