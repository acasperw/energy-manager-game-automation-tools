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

// /**
//  * Extracts the min, max, and current value of a jQuery UI slider from the page's script tags.
//  * @param page - The Puppeteer Page instance.
//  * @param sliderSelector - The selector for the slider container (e.g., '#g-fuel-slide').
//  * @returns An object containing the min, max, and current value of the slider.
//  */
// export async function getSliderValues(
//   page: Page,
//   sliderSelector: string
// ): Promise<{ min: number; max: number; value: number }> {
//   // Extract all script contents
//   const scripts = await page.$$eval('script', scripts =>
//     scripts.map(script => script.textContent)
//   );

//   // Find the script that initializes the slider
//   const sliderInitScript = scripts.find(script =>
//     script && script.includes(`$('#${sliderSelector.slice(1)}').slider`)
//   );

//   if (!sliderInitScript) {
//     throw new Error(`Slider initialization script for ${sliderSelector} not found.`);
//   }

//   // Regular expressions to extract min, max, and value
//   const minRegex = /min\s*:\s*(\d+)/;
//   const maxRegex = /max\s*:\s*(\d+)/;
//   const valueRegex = /value\s*:\s*(\d+)/;

//   const minMatch = sliderInitScript.match(minRegex);
//   const maxMatch = sliderInitScript.match(maxRegex);
//   const valueMatch = sliderInitScript.match(valueRegex);

//   if (!minMatch || !maxMatch || !valueMatch) {
//     throw new Error(`Unable to extract slider parameters from script.`);
//   }

//   const min = parseInt(minMatch[1], 10);
//   const max = parseInt(maxMatch[1], 10);
//   const value = parseInt(valueMatch[1], 10);

//   return { min, max, value };
// }
