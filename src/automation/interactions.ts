import { Page } from "puppeteer";
import { captureScreenshot } from "./browser";
import { getNumericValue } from "../utils/browser-data-helpers";
import { clickElement, getPaneSelectors } from "./helpers";
import { SidebarType, TabName } from "../types/interface";
import { delay } from "../utils/helpers";

export async function isSidebarOpen(page: Page, sidebarType: SidebarType): Promise<boolean> {
  const selectors = getPaneSelectors(sidebarType);
  const { paneId } = selectors;
  return await page.evaluate((selector) => {
    const pane = document.querySelector(selector) as HTMLElement | null;
    if (!pane) return false;
    const left = window.getComputedStyle(pane).left;
    return left === '0px';
  }, paneId);
}

export async function closeSidebar(page: Page, sidebarType: SidebarType) {
  try {
    const selectors = getPaneSelectors(sidebarType);
    const { paneId } = selectors;
    const sidebarIsOpen = await isSidebarOpen(page, sidebarType);
    if (sidebarIsOpen) {
      await clickElement(page, selectors.paneCloseHelperId);
      await page.waitForFunction((selector) => {
        const pane = document.querySelector(selector) as HTMLElement | null;
        return pane ? window.getComputedStyle(pane).left !== '0px' : true;
      }, { timeout: 10000 }, paneId);
      await delay(400); // Pane animation delay
    }
  } catch (error) {
    await captureScreenshot(page, `error-closing-sidebar-${sidebarType}.png`);
    throw error;
  }
}

export async function ensureSidebarOpen(page: Page, sidebarType: SidebarType, tabName: TabName) {
  try {
    await delay(400);
    const selectors = getPaneSelectors(sidebarType);
    const { paneId } = selectors;
    const allSidebarTypes = Object.values(SidebarType);
    await Promise.all(allSidebarTypes
      .filter((type) => type !== sidebarType)
      .map(async (type) => { await closeSidebar(page, type); }));

    const sidebarIsOpenFlag = await isSidebarOpen(page, sidebarType);

    if (!sidebarIsOpenFlag) {
      await clickElement(page, selectors.paneCloseHelperId);
      await page.waitForFunction((selector) => {
        const pane = document.querySelector(selector) as HTMLElement | null;
        return pane ? window.getComputedStyle(pane).left === '0px' : false;
      }, { timeout: 10000 }, paneId);
      await delay(400); // Pane animation delay
    }
    await switchTab(page, sidebarType, tabName);
  } catch (error) {
    await captureScreenshot(page, `error-sidebar-${sidebarType}.png`);
    throw error;
  }
}

export async function switchTab(page: Page, sidebarType: SidebarType, tabName: TabName) {
  const selectors = getPaneSelectors(sidebarType);

  const currentTabSelector = selectors.tabSelector(tabName);

  try {
    await delay(400);
    const isActive = await page.evaluate((selector) => {
      const tab = document.querySelector(selector);
      return tab?.classList.contains('pane-tabs-active') || false;
    }, currentTabSelector);

    if (!isActive) {
      await clickElement(page, currentTabSelector);
      await page.waitForFunction((selector) => {
        const tab = document.querySelector(selector);
        return tab?.classList.contains('pane-tabs-active') || false;
      }, { timeout: 10000 }, currentTabSelector);
      await delay(400);
    }
  } catch (error) {
    await captureScreenshot(page, `error-switching-tab-${sidebarType}-${tabName}.png`);
    throw error;
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
