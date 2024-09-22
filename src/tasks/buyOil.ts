import { Page } from "puppeteer";
import { GameSessionData } from "../types/interface";
import { clickElement } from "../automation/helpers";
import { switchCommoditiesTab } from "../automation/interactions";
import { delay } from "../utils/helpers";

async function getValueByLabel(page: Page, label: string): Promise<number> {
  return page.evaluate((label) => {
    const labels = Array.from(document.querySelectorAll('.util-dark-gray.fw-bolder'));
    for (const labelElement of labels) {
      if (labelElement.textContent?.trim() === label) {
        const valueElement = labelElement.nextElementSibling;
        if (valueElement) {
          const text = valueElement.textContent?.trim();
          // Remove non-numeric characters except for dots and minus signs
          const cleanedText = text!.replace(/[^0-9.-]/g, '');
          const amount = parseFloat(cleanedText);
          if (!isNaN(amount)) {
            return amount;
          }
        }
      }
    }
    return 0;
  }, label);
}

export async function calculateAmountNeededToFill(page: Page): Promise<number> {
  const holding = await getValueByLabel(page, 'Holding');
  const capacity = await getValueByLabel(page, 'Capacity');
  const amountNeeded = capacity - holding;
  return amountNeeded > 0 ? amountNeeded : 0;
}


async function calculateOilToBuy(page: Page): Promise<number> {
  let oilToBuy = 0;
  try {
    await clickElement(page, '.footer-new .col[onclick="popup(\'commodities.php\');"]');
    await page.waitForSelector('#main-modal-container', { visible: true });
    await page.waitForSelector('#commodities-main');
    await switchCommoditiesTab(page, 'oil');
    await delay(300);
    oilToBuy = await calculateAmountNeededToFill(page);
    await page.click('#main-modal-container .opa-light.text-center.intro-disable');
    await delay(300);
    await page.waitForSelector('#main-modal-container', { hidden: true });
    return oilToBuy;
  } catch (error) {
    console.error('Error opening oil page:', error);
    return oilToBuy
  }
}


export async function buyOil(page: Page, data: GameSessionData): Promise<number> {
  try {
    const oilToBuy = await calculateOilToBuy(page);

    if (data.userMoney < oilToBuy * data.oilBuyPrice) {
      console.error('Not enough money to buy Oil');
      return 0;
    }

    const response = await page.evaluate(async (amount) => {
      const url = `/api/commodities/buy.php?type=oil&amount=${amount}`;
      const fetchResponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, });
      return { status: fetchResponse.status, ok: fetchResponse.ok };
    }, oilToBuy);

    if (response.ok) {
      return oilToBuy;
    } else {
      console.error(`Failed to buy Oil. Server responded with status: ${response.status}`);
      return 0;
    }
  } catch (error) {
    console.error('Error buying Oil:', error);
    return 0;
  }
}
