import { CO2_PRICE_THRESHOLD_MAX, HYDROGEN_PRICE_THRESHOLD_MIN } from "../config";
import { EnergySalesProcess, GameSessionData, HydrogenSalesInfo, TaskDecisions } from "../types/interface";
import { formatCurrency } from "../utils/helpers";

export async function sessionSummaryReport(
  data: GameSessionData,
  decisions: TaskDecisions,
  energySalesInfo: EnergySalesProcess,
  hydrogenSalesTotal: HydrogenSalesInfo,
  co2QuotasBought: number,
  enabledPlants: number
) {
  console.log('\n\n--------- Session summary report --------');

  console.log('\nEnergy Sales:');
  const soldGrids = energySalesInfo.processedGridsResults.filter(grid => grid.action === 'sold');
  const totalSales = soldGrids.reduce((acc, grid) => acc + grid.sale, 0);
  const totalAdditionalProfit = soldGrids.reduce((acc, grid) => acc + grid.additionalProfit, 0);
  console.log(`Processed ${energySalesInfo.processedGrids} grids and sold ${soldGrids.length} for a total of ${formatCurrency(totalSales)} (${formatCurrency(totalAdditionalProfit)} additional profit)`);
  energySalesInfo.processedGridsResults.forEach(grid => {
    console.log(`Grid ${grid.gridName}: ${grid.action === 'sold' ? `Sold for ${formatCurrency(grid.sale)} (${formatCurrency(grid.additionalProfit)} additional profit)` : `Kept ${grid.highUpcomingValue ? 'due to higher upcoming value' : 'as it was not profitable'}`}`);
  });


  console.log('\nHydrogen:');
  console.log(`Value was ${formatCurrency(data.hydrogenValue)} and was ${data.hydrogenValue > HYDROGEN_PRICE_THRESHOLD_MIN ? 'eligible' : 'not eligible'} for selling. (Threshold: ${formatCurrency(HYDROGEN_PRICE_THRESHOLD_MIN)})`);
  if (decisions.sellHydrogen && hydrogenSalesTotal.sale > 0) {
    console.log(`Hydrogen sales total: ${formatCurrency(hydrogenSalesTotal.sale)}${hydrogenSalesTotal.includingSilo ? ' (including silo)' : ''}`);
  } else {
    console.log('No hydrogen sales were made.');
  }

  console.log('\nCO2 Quotas:');
  if (decisions.buyCo2Quotas && co2QuotasBought > 0) {
    console.log(`CO2 quotas bought for ${formatCurrency(data.co2Value)} (Threshold: ${formatCurrency(CO2_PRICE_THRESHOLD_MAX)}): ${co2QuotasBought}`);
  } else {
    console.log('No CO2 quotas were bought.');
  }


  // console.log(`Total output: ${data.plants.reduce((acc, plant) => acc + plant.output!, 0)}`);
  const highWearPlants = data.plants.filter(plant => plant.wear! > 80);
  if (highWearPlants.length > 0 || enabledPlants > 0) {
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
    console.log(`Enabled ${enabledPlants} plants.\n`);
  }
}