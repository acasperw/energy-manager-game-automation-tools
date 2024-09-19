import { Page } from "puppeteer";

export async function getNumericValue(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      const text = element.textContent || '';
      const cleanedText = text.replace(/[$,\s]/g, '');
      const amount = parseFloat(cleanedText);
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  }, selector);
}
