import puppeteer, { Browser, Page } from 'puppeteer';
import { BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD, SCREENSHOTS_DIR } from '../config';
import fs from 'fs/promises';
import path from 'path';
import { delay } from '../utils/helpers';
import { clickElement } from './helpers';

let browser: Browser | null = null;

export async function initializeBrowser(): Promise<{ browser: Browser; page: Page }> {
  browser = await puppeteer.launch({
    headless: !!process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=imagesEnabled=false', '--single-process', '--no-first-run', '--disable-accelerated-2d-canvas', '--disable-dev-shm-usage', '--no-zygote'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    defaultViewport: { width: 767, height: 960 },
  });
  const page = await browser.newPage();
  return { browser, page };
}

export async function loginToEnergyManager(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/weblogin/`, { waitUntil: 'networkidle0', timeout: 80000 });

  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    throw new Error('Please set LOGIN_EMAIL and LOGIN_PASSWORD in the .env file');
  }

  try {
    await delay(200);
    await page.waitForSelector('#signin-form', { visible: true });
    await page.type('#loginMail', LOGIN_EMAIL);
    await page.type('#loginPass', LOGIN_PASSWORD);
    await page.waitForSelector('#signin-form [type="submit"]:not([disabled])');
    const navigationPromise = page.waitForNavigation({ timeout: 180000 });
    await delay(200);
    await clickElement(page, '#signin-form [type="submit"]');
    await navigationPromise;
    await page.waitForSelector('#loader-wrapper', { hidden: true, timeout: 180000 });
    await handleLoginTip(page);
    await delay(200);
  } catch (error) {
    console.error('An error occurred during login:', error);
    await captureScreenshot(page, 'login-error.png');
    throw error;
  }
}

async function handleLoginTip(page: Page): Promise<void> {
  const loginTipElName = '#login-tip';
  const loginTipElement = await page.$(loginTipElName);
  if (loginTipElement) {
    const isDisplayed = await page.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style && style.display !== 'none' && style.visibility !== 'hidden' && (el as HTMLElement).offsetHeight > 0;
    }, loginTipElement);
    if (isDisplayed) {
      await loginTipElement.click();
      await page.waitForSelector(loginTipElName, { hidden: true });
    }
  }
}

export async function captureScreenshot(page: Page, filename: string): Promise<void> {
  const screenshotDir = path.resolve(SCREENSHOTS_DIR);
  const screenshotPath = path.join(screenshotDir, filename);
  console.log(`Capturing screenshot: ${screenshotPath}`);
  await fs.mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('Browser closed');
  }
}
