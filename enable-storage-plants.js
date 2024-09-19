const { initializeBrowser, loginToEnergyManager } = require('./src/automation/browser');
const { delay, formatEnergy } = require('./src/utils/helpers');
const { ARTIFICIAL_SLOWDOWN } = require('./config');
const { ensureSidebarOpen, switchTab, clickElement } = require('./src/automation/interactions');
const { getEnergyOutputAmount } = require('./src/data/collector');
const { getSunrise, getSunset } = require('sunrise-sunset-js');

function isDaylight(latitude, longitude) {
  const now = new Date();
  const sunrise = getSunrise(latitude, longitude);
  const sunset = getSunset(latitude, longitude);
  return now > sunrise && now < sunset;
}

function extractCoordinates(onclickAttr) {
  const match = onclickAttr.match(/panToAndOpen\(markers\[\d+],(-?\d+\.?\d*),(-?\d+\.?\d*)\)/);
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2])
    };
  }
  return null;
}

async function enableDisabledStorages(page) {
  try {
    const initialButtons = await page.$$('#production-outer .p-online-btn:not(.hidden)');
    let enabledCount = 0;
    while (enabledCount < initialButtons.length) {
      const buttons = await page.$$('#production-outer .p-online-btn:not(.hidden)');
      if (buttons.length === 0) {
        break;
      }
      try {
        await buttons[0].click();
        enabledCount++;
        console.log(`Enabled storage ${enabledCount} of ${initialButtons.length}`);
      } catch (clickError) {
        console.warn(`Failed to click button: ${clickError.message}`);
      }
      await delay(500 * ARTIFICIAL_SLOWDOWN);
    }
    if (initialButtons.length !== 0) {
      console.log(`Successfully enabled ${enabledCount} out of ${initialButtons.length} storage(s).`);
    }
  } catch (error) {
    console.error('Error in enableDisabledStorages:', error);
  }
}

async function reEnableSolarPlants(page) {
  try {
    await switchTab(page, 'plants');
    await page.waitForSelector('#production-plants-container');
    const solarPlants = await page.$$('#production-plants-container .plants-inner:has(.bi-sun):not(:has(.not-active))');
    let enabledCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let earliestSunrise = null;

    for (let i = 0; i < solarPlants.length; i++) {
      try {
        const plant = solarPlants[i];
        const onclickAttr = await plant.$eval('.col-10', el => el.getAttribute('onclick'));
        const coordinates = extractCoordinates(onclickAttr);

        if (coordinates) {
          const sunrise = getSunrise(coordinates.latitude, coordinates.longitude);
          if (!earliestSunrise || sunrise < earliestSunrise) {
            earliestSunrise = sunrise;
          }

          if (isDaylight(coordinates.latitude, coordinates.longitude)) {
            const powerSwitchSelector = `.plants-inner:nth-child(${i + 1}) .pwr-switch input`;

            // Toggle off
            await clickElement(page, powerSwitchSelector);
            await delay(500 * ARTIFICIAL_SLOWDOWN);

            // Toggle on
            await clickElement(page, powerSwitchSelector);
            await delay(100 * ARTIFICIAL_SLOWDOWN);

            enabledCount++;
          } else {
            skippedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing plant ${i + 1}:`, error.message);
        errorCount++;
      }
    }

    console.log(`Re-enabled ${enabledCount} out of ${solarPlants.length} solar plants. Skipped ${skippedCount} due to night time. Encountered errors with ${errorCount} plants.`);
    return earliestSunrise;
  } catch (error) {
    console.error('Error in reEnableSolarPlants:', error);
    return null;
  }
}

async function enableAllOffPlants(page) {
  try {
    await switchTab(page, 'plants');
    await page.waitForSelector('#production-plants-container');
    const offPlants = await page.$$('#production-plants-container .plants-inner:has(input[type="checkbox"]:not(:checked)):not(:has(.not-active))');
    for (let i = 0; i < offPlants.length; i++) {
      const plant = offPlants[i];
      const powerSwitch = await plant.$('.pwr-switch');
      if (powerSwitch) {
        await powerSwitch.click();
        await delay(500 * ARTIFICIAL_SLOWDOWN);
      } else {
        console.warn(`Could not find power switch for plant ${i + 1}`);
      }
    }
    if (offPlants.length > 0) {
      console.log(`Enabled ${offPlants.length} plants that were off.`);
    }
  } catch (error) {
    console.error('Error in enableAllOffPlants:', error);
  }
}

async function enableDisabledStoragePlants() {
  const { browser, page } = await initializeBrowser();
  try {
    await loginToEnergyManager(page);
    await ensureSidebarOpen(page);
    const kwEnergyBefore = await getEnergyOutputAmount(page);

    await enableDisabledStorages(page);
    const earliestSunrise = await reEnableSolarPlants(page);
    await enableAllOffPlants(page);

    const kwEnergyAfter = await getEnergyOutputAmount(page);
    console.log(`Energy output: ${formatEnergy(kwEnergyBefore)} -> ${formatEnergy(kwEnergyAfter)}`);

    return earliestSunrise;
  } catch (error) {
    console.error('An error occurred:', error);
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = { enableDisabledStoragePlants };

// Allow running as a standalone script
if (require.main === module) {
  enableDisabledStoragePlants().catch(console.error);
}
