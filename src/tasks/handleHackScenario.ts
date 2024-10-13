import { Page } from 'puppeteer';
import { captureScreenshot } from '../automation/browser';

export async function handleHackScenario(page: Page): Promise<void> {
  console.log('Hack scenario detected');

  try {
    await page.waitForSelector('#hackOverlay', { visible: true });

    // Directly set the hackOverlay display to none
    await page.evaluate(() => {
      const hackOverlay = document.getElementById('hackOverlay');
      if (hackOverlay) {
        hackOverlay.style.display = 'none';
      }
    });

  } catch (error) {
    console.error('Error handling hack scenario:', error);
    captureScreenshot(page, 'hack-scenario-error.png');
    throw error;
  }
}
