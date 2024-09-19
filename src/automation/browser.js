const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { LOGIN_URL, LOGIN_EMAIL, LOGIN_PASSWORD } = require('../../config');

async function initializeBrowser() {

  const puppeteerArgs = {
    headless: false,
    args: ['--blink-settings=imagesEnabled=false'],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerArgs.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    puppeteerArgs.args = ['--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=imagesEnabled=false'];
    puppeteerArgs.headless = true;
  }

  const browser = await puppeteer.launch(puppeteerArgs);

  const page = await browser.newPage();

  // Set a larger viewport size (e.g., 1920x1080)
  await page.setViewport({
    width: 760,
    height: 1300,
    deviceScaleFactor: 1,
  });

  return { browser, page };
}

async function loginToEnergyManager(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 80000 });

  try {
    await page.waitForSelector('#signin-form');
    await page.type('#loginMail', LOGIN_EMAIL);
    await page.type('#loginPass', LOGIN_PASSWORD);
    await page.waitForSelector('#signin-form [type="submit"]:not([disabled])');
    const navigationPromise = page.waitForNavigation({ timeout: 180000 });
    await page.click('#signin-form [type="submit"]');
    await navigationPromise;
    await page.waitForSelector('#loader-wrapper', { hidden: true, timeout: 280000 });
  } catch (error) {
    console.error('An error occurred during login:', error);
    await captureScreenshot(page, 'login-error.png');
    throw error;
  }
}

async function captureScreenshot(page, filename) {
  const screenshotPath = path.join('/usr/src/app/screenshots', filename);
  console.log(`Capturing screenshot: ${screenshotPath}`);
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot captured.');
}

module.exports = { initializeBrowser, loginToEnergyManager, captureScreenshot };