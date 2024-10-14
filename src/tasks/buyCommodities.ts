import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { postApiData } from "../utils/api-requests";
import { getSliderValuesFromString } from "../utils/browser-data-helpers";
import { OIL_PRICE_THRESHOLD_MAX, COAL_PRICE_THRESHOLD_MAX, URANIUM_PRICE_THRESHOLD_MAX } from "../config";

interface CommodityInfo {
  type: 'oil' | 'coal' | 'uranium';
  priceKey: keyof GameSessionData;
  apiEndpoint: string;
  priceThreshold: number;
}

const commodityInfoMap: Record<string, CommodityInfo> = {
  oil: { type: 'oil', priceKey: 'oilBuyPricePerKg', apiEndpoint: 'oil', priceThreshold: OIL_PRICE_THRESHOLD_MAX },
  coal: { type: 'coal', priceKey: 'coalPricePerKg', apiEndpoint: 'coal', priceThreshold: COAL_PRICE_THRESHOLD_MAX },
  uranium: { type: 'uranium', priceKey: 'uraniumPricePerKg', apiEndpoint: 'uranium', priceThreshold: URANIUM_PRICE_THRESHOLD_MAX },
};

export async function buyCommodities(page: Page, data: GameSessionData): Promise<Record<string, number>> {
  const commoditiesBought: Record<string, number> = {};

  for (const [commodityName, info] of Object.entries(commodityInfoMap)) {
    try {

      const commodityPrice = data[info.priceKey] as number;

      // Check if the current price is below the threshold
      if (commodityPrice < info.priceThreshold) {
        const commoditiesBuyHtml = await postApiData<string>(page, `/commodities.php?type=${info.apiEndpoint}&hideNavbar=true`);
        const maxAmountPurchasable = parseCommoditiesBuyHtml(commoditiesBuyHtml);
        const theoreticalMaxAmountPurchasable = Math.floor(data.userMoney / commodityPrice);
        const amountToBuy = Math.min(maxAmountPurchasable, theoreticalMaxAmountPurchasable);

        if (amountToBuy > 0) {
          await postApiData<string>(page, `/api/commodities/buy.php?type=${info.apiEndpoint}&amount=${amountToBuy}`);
          const totalCost = amountToBuy * commodityPrice;
          data.userMoney -= totalCost;
          commoditiesBought[commodityName] = amountToBuy;
        } else {
          commoditiesBought[commodityName] = 0;
        }
      } else {
        commoditiesBought[commodityName] = 0;
      }
    } catch (error) {
      console.error(`Error buying ${commodityName}:`, error);
      commoditiesBought[commodityName] = 0;
    }
  }

  return commoditiesBought;
}

function parseCommoditiesBuyHtml(html: string): number {
  const maxAmountPurchasable = getSliderValuesFromString(html).max;
  return maxAmountPurchasable;
}
