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

/**
 * Extracts the min, max, and current value of a jQuery UI slider from the page's script tags.
 * @param page - The Puppeteer Page instance.
 * @param sliderSelector - The selector for the slider container (e.g., '#g-fuel-slide').
 * @returns An object containing the min, max, and current value of the slider.
 */
export async function getSliderValues(page: Page): Promise<{ min: number; max: number; value?: number }> {

  const script = await page.evaluate(() => {
    const script = document.querySelector('#fuel-management-main script');
    return script ? script.textContent : '';
  });

  if (!script) {
    throw new Error(`Slider initialization script for not found.`);
  }

  return getSliderValuesFromString(script);
}

export function getSliderValuesFromString(script: string): { min: number; max: number; value?: number } {
  // Regular expressions to extract min, max, and value
  const minRegex = /min\s*:\s*(\d+)/;
  const maxRegex = /max\s*:\s*(-?\d+)/;
  const valueRegex = /value\s*:\s*(\d+)/;

  const minMatch = script.match(minRegex);
  const maxMatch = script.match(maxRegex);
  const valueMatch = script.match(valueRegex);

  if (!minMatch || !maxMatch) {
    throw new Error(`Unable to extract slider parameters from script.`);
  }

  const min = parseInt(minMatch[1], 10);
  const max = parseInt(maxMatch[1], 10);
  const value = valueMatch ? parseInt(valueMatch[1], 10) : undefined;

  return { min, max, value };
}
