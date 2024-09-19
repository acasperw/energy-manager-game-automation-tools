import { Page } from "puppeteer";
import { captureScreenshot } from "./browser";
import { tabName } from "../types/interface";
import { getNumericValue } from "../utils/browser-data-helpers";
import { delay } from "../utils/helpers";
import { clickElement } from "./helpers";

export async function ensureSidebarOpen(page: Page) {
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
    }
    await switchTab(page, 'storage');
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
