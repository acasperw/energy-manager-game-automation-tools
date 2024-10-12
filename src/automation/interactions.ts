import { Page } from "puppeteer";
import { getNumericValue } from "../utils/browser-data-helpers";
import { clickElement } from "./helpers";
import { tabName } from "../types/interface";
import { delay } from "../utils/helpers";
import { captureScreenshot } from "./browser";

export async function ensureSidebarOpen(page: Page, tabName: tabName = 'storage') {
  try {
    await delay(200);
    await page.waitForSelector('#pane-close-helper');
    const isSidebarClosed = await page.evaluate(() => {
      const span = document.querySelector('#pane-close-helper span');
      return span && span.classList.contains('bi-lightning-fill');
    });
    if (isSidebarClosed) {
      await page.click('#pane-close-helper');
      await page.waitForSelector('#pane-close-helper span.glyphicons-chevron-left');
      await delay(350);
    }
    await switchTab(page, tabName);
  } catch (error) {
    await captureScreenshot(page, 'error-sidebar.png');
    throw error;
  }
}

export async function switchTab(page: Page, tabName: tabName) {
  const validTabs = ['plants', 'storage'];
  if (!validTabs.includes(tabName)) {
    throw new Error(`Invalid tab name. Must be one of: ${validTabs.join(', ')}`);
  }
  await delay(350);
  const tabSelector = `#pane-${tabName}`;
  const isActive = await page.evaluate((selector) => {
    const tab = document.querySelector(selector);
    return tab?.classList.contains('pane-tabs-active');
  }, tabSelector);
  if (!isActive) {
    await clickElement(page, tabSelector);
    await page.waitForFunction((selector) => document.querySelector(selector)?.classList.contains('pane-tabs-active'), { timeout: 5000 }, tabSelector);
  }
}

export async function getSalesResultPopup(page: Page) {
  await page.waitForSelector('#sales-result', { visible: true });
  const salesTotal = await getNumericValue(page, '#sales-total-income');
  await hideSalesResultPopup(page);
  return salesTotal;
}

export async function hideSalesResultPopup(page: Page) {
  await page.evaluate(() => {
    const salesResult = document.querySelector('#sales-result');
    if (salesResult) {
      (salesResult as HTMLElement).style.display = 'none';
    }
  });
}

export async function switchCommoditiesTab(page: Page, tabName: 'oil' | 'coal' | 'u-235' | 'co2'): Promise<void> {
  await page.evaluate((tabName) => {
    const tabOnclickMap: { [key: string]: string } = {
      'oil': 'commodities.php?type=oil',
      'coal': 'commodities.php?type=coal',
      'u-235': 'commodities.php?type=uranium',
      'co2': 'co2.php',
    };

    const desiredOnclickSubstring = tabOnclickMap[tabName];
    const activeButton = document.querySelector('.btn-nav.btn-nav-active');
    let isActiveTabDesired = false;
    if (activeButton) {
      const activeOnclick = activeButton.getAttribute('onclick');
      if (activeOnclick && activeOnclick.includes(desiredOnclickSubstring)) {
        isActiveTabDesired = true;
      }
    }
    if (isActiveTabDesired) {
      return;
    }

    const buttons = document.querySelectorAll('.btn-nav');
    for (const button of Array.from(buttons)) {
      const onclick = button.getAttribute('onclick');
      if (onclick && onclick.includes(desiredOnclickSubstring)) {
        (button as HTMLElement).click();
        return;
      }
    }
    throw new Error(`Could not find tab with name: ${tabName}`);
  }, tabName);

  await page.waitForSelector('#commodities-main');
}

export async function getEnergyOutputAmount(page: Page): Promise<number | null> {
  try {
    const outputKw = await page.$eval('#headerOutput', el => el.getAttribute('output-kw'));
    if (!outputKw) {
      throw new Error('Output KW attribute not found');
    }
    return parseFloat(outputKw);
  } catch (error) {
    console.error('Error getting energy output amount:', error);
    return null;
  }
}

export async function waitForMainModal(page: Page) {
  await page.waitForSelector('#popup', { visible: true });
  await page.waitForSelector('#main-modal-container', { visible: true });
}

export async function closeMainModal(page: Page) {
  await page.click('#main-modal-container .opa-light.text-center.intro-disable');
  await page.waitForSelector('#main-modal-container', { hidden: true });
  await page.waitForSelector('#popup', { hidden: true });
}
