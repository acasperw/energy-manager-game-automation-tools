import { CO2_PRICE_THRESHOLD_MAX, ENHANCED_REPORTING, HYDROGEN_PRICE_THRESHOLD_MIN, OIL_PRICE_THRESHOLD_MAX } from "../config";
import { RefuelEnableStoragesPlantsResult, EnergySalesProcess, GameSessionData, HydrogenSalesInfo, ReEnablePlantsResult, TaskDecisions, VesselInteractionReport, VesselStatus } from "../types/interface";
import { displayAverageFactors, extractFactorsPerGrid, updateFactorsSummary } from "../utils/data-storage";
import { formatCurrency, formatEnergy, formatNumber } from "../utils/helpers";

export async function sessionSummaryReport(
  data: GameSessionData,
  decisions: TaskDecisions,
  energySalesInfo: EnergySalesProcess,
  hydrogenSalesTotal: HydrogenSalesInfo,
  co2QuotasBought: number,
  enabledPlants: RefuelEnableStoragesPlantsResult,
  reenabledSolarPlants: ReEnablePlantsResult,
  oilBought: number,
  uraniumBought: number,
  storeHydrogen: boolean,
  didResearch: number,
  vesselInteractionsReport: VesselInteractionReport[]
) {

  // Save plant factors to file
  const factorsPerGrid: Record<string, Record<string, number>> = extractFactorsPerGrid(data);
  await updateFactorsSummary(factorsPerGrid);

  if (didResearch > 0) {
    console.log(`\nResearch: ${didResearch} research items were started.`);
  }

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
    console.log(`Value was ${formatCurrency(data.hydrogen.hydrogenPrice)} and was ${data.hydrogen.hydrogenPrice > HYDROGEN_PRICE_THRESHOLD_MIN ? 'eligible' : 'not eligible'} for selling. (Threshold: ${formatCurrency(HYDROGEN_PRICE_THRESHOLD_MIN)})`);
    if (decisions.sellHydrogen && hydrogenSalesTotal.sale > 0) {
      console.log(`Hydrogen sales total: ${formatCurrency(hydrogenSalesTotal.sale)}${hydrogenSalesTotal.includingSilo ? ' (including from silo)' : ''}`);
    } else {
      console.log('No hydrogen sales were made.');
    }
    if (storeHydrogen) {
      console.log('Stored hydrogen in silo.');
    }
  }

  if (decisions.buyCo2Quotas && co2QuotasBought > 0) {
    console.log('\nCO2 Quotas:');
    if (decisions.buyCo2Quotas && co2QuotasBought > 0) {
      console.log(`CO2 quotas bought for ${formatCurrency(data.co2Value)} (Threshold: ${formatCurrency(CO2_PRICE_THRESHOLD_MAX)}): ${co2QuotasBought.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);
    } else {
      console.log('No CO2 quotas were bought.');
    }
  }

  if (decisions.buyOil && oilBought > 0) {
    console.log('\nOil:');
    console.log(`Oil bought for ${formatCurrency(data.oilBuyPrice)} (Threshold: ${formatCurrency(OIL_PRICE_THRESHOLD_MAX)}): ${oilBought.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);
  }

  const highWearPlants = data.plants.filter(plant => plant.wear! > 80);
  if (highWearPlants.length > 0 || enabledPlants.totalEnabled > 0 || (decisions.reenableSolarPlants && decisions.solarPlantsToReenable.length)) {
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
  if (enabledPlants.totalEnabled > 0) {
    console.log(`Enabled ${enabledPlants.totalEnabled} plants${enabledPlants.totalSkipped > 0 ? ` and skipped ${enabledPlants.totalSkipped}` : ''}.`);
    if (enabledPlants.didRefuel) {
      console.log(`Successfully refueled plants to ${enabledPlants.pctRefueled}%`);
    }
    if (enabledPlants.totalOutOfFuel > 0) {
      console.log(`Skipped ${enabledPlants.totalOutOfFuel} plants due to lack of fuel.`);
    }
  }
  if (enabledPlants.totalDisabled > 0) {
    console.log(`Disabled ${enabledPlants.totalDisabled} plants.`);
  }
  if (decisions.reenableSolarPlants && decisions.solarPlantsToReenable.length) {
    console.log(`Re-enabled ${reenabledSolarPlants.enabledPlants} out of ${decisions.solarPlantsToReenable.length} solar plants.`);
    console.log(`Energy output: ${formatEnergy(reenabledSolarPlants.kwEnergyBefore)} -> ${formatEnergy(reenabledSolarPlants.kwEnergyAfter)}`);
  }

  if (vesselInteractionsReport.length > 0) {
    console.log('\nVessel Activities:');
    vesselInteractionsReport.forEach(report => {
      console.log(generateVesselReport(report));
    });
  }

  console.log('\n');

  if (ENHANCED_REPORTING) {

    // Top storage capacities
    const topStorages = data.energyGrids.filter(grid => grid.storages.some(storage => storage.plantsConnected > 0)).map(grid => {
      return {
        gridName: grid.gridName,
        totalCapacity: grid.totalCapacity
      };
    }).sort((a, b) => b.totalCapacity - a.totalCapacity);
    console.log('Top Storage Capacities:');
    topStorages.forEach(storage => {
      console.log(`${storage.gridName}: ${formatEnergy(storage.totalCapacity)}`);
    });

    await displayAverageFactors('cloudCover');
    await displayAverageFactors('output');
    await displayAverageFactors('windspeed');
  }

}

function generateVesselReport(report: VesselInteractionReport): string {
  const parts = [
    `Vessel ${report.vesselName}:`,
    generateStatusChangeInfo(report),
    report.action,
    generateOilInfo(report),
    generateDestinationInfo(report)
  ];

  return parts.filter(Boolean).join(' ');
}

function generateStatusChangeInfo(report: VesselInteractionReport): string {
  return report.previousStatus !== report.newStatus
    ? `Status changed from ${report.previousStatus} to ${report.newStatus}.`
    : `Status remained ${report.newStatus}.`;
}

function generateOilInfo(report: VesselInteractionReport): string {
  if (!report.oilOnboard) return '';

  const oilAmount = formatNumber(report.oilOnboard);
  return report.newStatus === VesselStatus.InPortWithOil
    ? `Ready to unload ${oilAmount} barrels of oil.`
    : `Oil on board: ${oilAmount} barrels.`;
}

function generateDestinationInfo(report: VesselInteractionReport): string {
  if (!report.destination) return '';

  let info = `Destination: ${report.destination.name}`;
  if (report.destination.distance) {
    info += ` (${formatNumber(report.destination.distance)} nautical miles away)`;
  }
  return info;
}
