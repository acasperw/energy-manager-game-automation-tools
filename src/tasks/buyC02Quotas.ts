import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";

function calculateQuotasForCO2(co2Amount: number): number {
  const quotasPerGram = 1.65 * Math.pow(10, 8); // 1.65 * 10^8 quotas per gram
  return Math.round(quotasPerGram * co2Amount) - 1000; // Round to the nearest whole number
}

export async function buyC02Quotas(page: Page, data: GameSessionData): Promise<number> {
  try {
    const quotasToBuy = calculateQuotasForCO2(data.emissionPerKwh);

    const response = await page.evaluate(async (amount) => {
      const url = `/api/co2/buy.php?amount=${amount}`;
      const fetchResponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', }, });
      return {
        status: fetchResponse.status,
        ok: fetchResponse.ok,
      };
    }, quotasToBuy);

    if (response.ok) {
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
