const { collectAndSaveEnergyData } = require('./src/data/collector');
const { initializeBrowser, loginToEnergyManager } = require('./src/automation/browser');
const { ensureSidebarOpen } = require('./src/automation/interactions');

async function collectEnergyData() {
  const { browser, page } = await initializeBrowser();

  try {
    await loginToEnergyManager(page);
    await ensureSidebarOpen(page);
    await collectAndSaveEnergyData(page);
    console.log('Data collection complete.');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
}

module.exports = { collectEnergyData };

// Allow running as a standalone script
if (require.main === module) {
  collectEnergyData().catch(console.error);
}