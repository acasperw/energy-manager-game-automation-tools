const { ARTIFICIAL_SLOWDOWN } = require('../../config');
const { delay } = require('../utils/helpers');
const { captureScreenshot } = require('../automation/browser');

async function hideSalesResultPopup(page) {
  await page.evaluate(() => {
    const salesResult = document.querySelector('#sales-result');
    if (salesResult) {
      salesResult.style.display = 'none';
    }
  });
}

async function clickDollarSignAndWaitForModal(page) {
  await page.waitForSelector('.bi.bi-currency-dollar');
  await page.click('#details-pane .bi.bi-currency-dollar');
  await page.waitForSelector('#main-modal-container');
  await delay(150 * ARTIFICIAL_SLOWDOWN);
}

async function openAdvancedTab(page) {
  const advancedButtonExists = await page.evaluate(() => {
    const buttons = document.querySelectorAll('#main-modal-container button');
    return buttons.length >= 2;
  });

  if (advancedButtonExists) {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('#main-modal-container button');
      buttons[1].click();
    });
    await page.waitForSelector('#advanced-tab', { timeout: 5000 }).catch(() => console.log('Advanced tab did not appear'));
  }
  await delay(100 * ARTIFICIAL_SLOWDOWN);
}

async function ifElementExists(page, selector) {
  return !!(await page.$eval(selector, () => true).catch(() => false));
}

async function switchTab(page, tabName) {
  const validTabs = ['plants', 'storage'];
  if (!validTabs.includes(tabName)) {
    throw new Error(`Invalid tab name. Must be one of: ${validTabs.join(', ')}`);
  }
  await delay(1000 * ARTIFICIAL_SLOWDOWN);
  const tabSelector = `#pane-${tabName}`;
  const isActive = await page.evaluate((selector) => {
    const tab = document.querySelector(selector);
    return tab.classList.contains('pane-tabs-active');
  }, tabSelector);

  if (!isActive) {
    await page.click(tabSelector);
    await page.waitForFunction(
      (selector) => document.querySelector(selector).classList.contains('pane-tabs-active'),
      { timeout: 5000 },
      tabSelector
    );
    await delay(500 * ARTIFICIAL_SLOWDOWN);
  }
}

async function ensureSidebarOpen(page) {
  try {
    await delay(1000 * ARTIFICIAL_SLOWDOWN);
    await page.waitForSelector('#pane-close-helper');
    const isSidebarClosed = await page.evaluate(() => {
      const span = document.querySelector('#pane-close-helper span');
      return span && span.classList.contains('bi-lightning-fill');
    });

    if (isSidebarClosed) {
      await delay(500 * ARTIFICIAL_SLOWDOWN);
      await page.click('#pane-close-helper');
      await page.waitForSelector('#pane-close-helper span.glyphicons-chevron-left');
      await delay(500 * ARTIFICIAL_SLOWDOWN);
    }
    await switchTab(page, 'storage');
  } catch (error) {
    await captureScreenshot(page, 'error-sidebar.png');
    throw error;
  }
}

async function clickElement(page, selector) {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.click();
    } else {
      throw new Error(`Element with selector ${sel} not found`);
    }
  }, selector);
}

module.exports = {
  hideSalesResultPopup,
  clickDollarSignAndWaitForModal,
  openAdvancedTab,
  ifElementExists,
  ensureSidebarOpen,
  switchTab,
  clickElement
};