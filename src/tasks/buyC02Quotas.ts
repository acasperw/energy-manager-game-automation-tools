import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { postApiData } from "../data/collector";
import { getSliderValuesFromString } from "../utils/browser-data-helpers";

async function getCo2QuotasToBuy(page: Page): Promise<number> {
  const response: string = await postApiData(page, '/co2.php');
  const { max } = getSliderValuesFromString(response);
  const roundedMax = max >= 0 ? Math.floor(max / 10) * 10 : Math.ceil(max / 10) * 10;
  return roundedMax;
}

function calculateCost(quotas: number, price: number): number {
  return ((quotas / 40) * price) / 1000;
}

function calculateMaxAffordableQuotas(money: number, price: number): number {
  const maxQuotas = Math.floor((money * 40000) / price);
  return Math.floor(maxQuotas / 10) * 10; // Round down to nearest 10
}

export async function buyC02Quotas(page: Page, data: GameSessionData): Promise<number> {
  try {
    const maxQuotas = await getCo2QuotasToBuy(page);
    const price = data.co2Value;

    if (maxQuotas <= 0) {
      return 0;
    }

    let quotasToBuy = maxQuotas;
    let cost = calculateCost(quotasToBuy, price);

    // Check if the purchase is affordable, if not, calculate the maximum affordable amount
    if (cost > data.userMoney) {
      quotasToBuy = calculateMaxAffordableQuotas(data.userMoney, price);
      cost = calculateCost(quotasToBuy, price);
    }

    if (quotasToBuy <= 0) {
      return 0;
    }

    const response = await page.evaluate(async (amount) => {
      const url = `/api/co2/buy.php?amount=${amount}`;
      const fetchResponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', }, });
      return {
        status: fetchResponse.status,
        ok: fetchResponse.ok,
      };
    }, quotasToBuy);

    if (response.ok) {
      data.userMoney -= cost;
      return quotasToBuy;
    } else {
      console.error(`Failed to buy CO2 quotas. Server responded with status: ${response.status}`);
      return 0;
    }

  } catch (error) {
    console.error('Error buying CO2 quotas:', error);
    return 0;
  }
}
