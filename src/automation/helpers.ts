import { Page } from "puppeteer";

export async function clickElement(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      (element as HTMLElement).click();
    } else {
      throw new Error(`Element with selector ${sel} not found`);
    }
  }, selector);
}

export async function ifElementExists(page: Page, selector: string) {
  return !!(await page.$eval(selector, () => true).catch(() => false));
}
