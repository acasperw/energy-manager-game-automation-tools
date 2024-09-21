import { CO2_PRICE_THRESHOLD_MAX, HYDROGEN_PRICE_THRESHOLD_MIN } from "../config";
import { EnergySalesProcess, GameSessionData, HydrogenSalesInfo, ReEnablePlants, TaskDecisions } from "../types/interface";
import { formatCurrency, formatEnergy } from "../utils/helpers";

export async function sessionSummaryReport(
  data: GameSessionData,
  decisions: TaskDecisions,
  energySalesInfo: EnergySalesProcess,
  hydrogenSalesTotal: HydrogenSalesInfo,
  co2QuotasBought: number,
  enabledPlants: number,
  reenabledSolarPlants: ReEnablePlants
) {
  console.log('\n\n--------- Session summary report --------');

  if (energySalesInfo.processedGridsResults.length > 0) {
    console.log('\nEnergy Sales:');
    const soldGrids = energySalesInfo.processedGridsResults.filter(grid => grid.action === 'sold');
    const totalSales = soldGrids.reduce((acc, grid) => acc + grid.sale, 0);
    const totalAdditionalProfit = soldGrids.reduce((acc, grid) => acc + grid.additionalProfit, 0);
    console.log(`Processed ${energySalesInfo.processedGrids} grids and sold ${soldGrids.length} for a total of ${formatCurrency(totalSales)}${totalAdditionalProfit > 0 ? ` (${formatCurrency(totalAdditionalProfit)} additional profit)` : ''}.`);
    energySalesInfo.processedGridsResults.forEach(grid => {
      console.log(`Grid ${grid.gridName}: ${grid.action === 'sold' ? `Sold ${grid.soldTo ? `to ${grid.soldTo}` : ''} for ${formatCurrency(grid.sale)} (${formatCurrency(grid.additionalProfit)} additional profit)` : `Kept ${grid.highUpcomingValue ? 'due to higher upcoming value' : 'as it was not profitable'}`}`);
    });
  }

  if (decisions.sellHydrogen && hydrogenSalesTotal.sale > 0) {
    console.log('\nHydrogen:');
    console.log(`Value was ${formatCurrency(data.hydrogenValue)} and was ${data.hydrogenValue > HYDROGEN_PRICE_THRESHOLD_MIN ? 'eligible' : 'not eligible'} for selling. (Threshold: ${formatCurrency(HYDROGEN_PRICE_THRESHOLD_MIN)})`);
    if (decisions.sellHydrogen && hydrogenSalesTotal.sale > 0) {
      console.log(`Hydrogen sales total: ${formatCurrency(hydrogenSalesTotal.sale)}${hydrogenSalesTotal.includingSilo ? ' (including silo)' : ''}`);
    } else {
      console.log('No hydrogen sales were made.');
    }
  }

  if (decisions.buyCo2Quotas && co2QuotasBought > 0) {
    console.log('\nCO2 Quotas:');
    if (decisions.buyCo2Quotas && co2QuotasBought > 0) {
      console.log(`CO2 quotas bought for ${formatCurrency(data.co2Value)} (Threshold: ${formatCurrency(CO2_PRICE_THRESHOLD_MAX)}): ${co2QuotasBought}`);
    } else {
      console.log('No CO2 quotas were bought.');
    }
  }

  const highWearPlants = data.plants.filter(plant => plant.wear! > 80);
  if (highWearPlants.length > 0 || enabledPlants > 0 || (decisions.reenableSolarPlants && decisions.solarPlantsToReenable.length)) {
    console.log('\nPlants:');
  }
  if (highWearPlants.length > 0) {
    console.log('High wear plants:');
    highWearPlants.forEach(plant => {
      const storage = data.energyGrids.find(storage => storage.storages.some(s => s.id === plant.storageId?.toString()));
      if (storage) {
        console.log(`Plant ${plant.plantId} in grid ${storage.gridName} has a wear of ${plant.wear}%`);
      }
    });
  }
  if (enabledPlants > 0) {
    console.log(`Enabled ${enabledPlants} plants.`);
  }
  if (decisions.reenableSolarPlants && decisions.solarPlantsToReenable.length) {
    console.log(`Re-enabled ${reenabledSolarPlants.enabledPlants} out of ${decisions.solarPlantsToReenable.length} solar plants.`);
    console.log(`Energy output: ${formatEnergy(reenabledSolarPlants.kwEnergyBefore)} -> ${formatEnergy(reenabledSolarPlants.kwEnergyAfter)}`);
  }
  console.log('\n');

}
