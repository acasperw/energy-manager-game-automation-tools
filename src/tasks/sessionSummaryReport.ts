import { CO2_PRICE_THRESHOLD_MAX, COAL_PRICE_THRESHOLD_MAX, HYDROGEN_PRICE_THRESHOLD_MIN, OIL_PRICE_THRESHOLD_MAX, OIL_SELL_PRICE_THRESHOLD_MIN, URANIUM_PRICE_THRESHOLD_MAX } from "../config";
import { EnergySalesProcess, GameSessionData, HydrogenSalesInfo, TaskDecisions, VesselInteractionReport, VesselStatus, StorageAndPlantManagementResult } from "../types/interface";
import { formatCurrency, formatEnergy, formatNumber } from "../utils/helpers";

export async function sessionSummaryReport(
  data: GameSessionData,
  decisions: TaskDecisions,
  energySalesInfo: EnergySalesProcess,
  hydrogenSalesTotal: HydrogenSalesInfo,
  co2QuotasBought: number,
  storagePlantManagementResult: StorageAndPlantManagementResult,
  commoditiesBought: Record<string, number>,
  storeHydrogen: boolean,
  didResearch: number,
  vesselInteractionsReport: VesselInteractionReport[]
) {

  // // Save plant factors to file
  // const factorsPerGrid: Record<string, Record<string, number>> = extractFactorsPerGrid(data);
  // await updateFactorsSummary(factorsPerGrid);

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
    console.log(`Value was ${formatCurrency(data.hydrogen.hydrogenPricePerKg)} and was ${data.hydrogen.hydrogenPricePerKg > HYDROGEN_PRICE_THRESHOLD_MIN ? 'eligible' : 'not eligible'} for selling. (Threshold: ${formatCurrency(HYDROGEN_PRICE_THRESHOLD_MIN)})`);
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
    console.log('\nCO2 quotas:');
    if (decisions.buyCo2Quotas && co2QuotasBought > 0) {
      console.log(`CO2 quotas bought for ${formatCurrency(data.co2Value)} (Threshold: ${formatCurrency(CO2_PRICE_THRESHOLD_MAX)}): ${formatNumber(co2QuotasBought)}`);
    }
  }

  if (decisions.buyCommodities && commoditiesBought.length > 0) {
    console.log('\nFuel purchased:');

    const commodities = [
      { name: 'Oil', amount: commoditiesBought.oil, price: data.oilBuyPricePerKg, threshold: OIL_PRICE_THRESHOLD_MAX },
      { name: 'Coal', amount: commoditiesBought.coal, price: data.coalPricePerKg, threshold: COAL_PRICE_THRESHOLD_MAX },
      { name: 'Uranium', amount: commoditiesBought.uranium, price: data.uraniumPricePerKg, threshold: URANIUM_PRICE_THRESHOLD_MAX }
    ];

    commodities.forEach(commodity => {
      if (commodity.amount > 0) {
        console.log(`${commodity.name} bought for ${formatCurrency(commodity.price)} (Threshold: ${formatCurrency(commodity.threshold)}): ${formatNumber(commodity.amount)}`);
      }
    });
  }

  console.log('\nPlant Management:');
  if (storagePlantManagementResult.totalEnabled > 0 || storagePlantManagementResult.totalDisabled > 0 || storagePlantManagementResult.totalSwitched > 0) {

    if (storagePlantManagementResult.totalEnabled > 0) {
      console.log(`Enabled ${storagePlantManagementResult.totalEnabled} plants.`);
    }
    if (storagePlantManagementResult.totalDisabled > 0) {
      console.log(`Disabled ${storagePlantManagementResult.totalDisabled} plants.`);
    }
    if (storagePlantManagementResult.totalSwitched > 0) {
      console.log(`Switched ${storagePlantManagementResult.totalSwitched} plants to different storages.`);
    }
    if (storagePlantManagementResult.totalSkipped > 0) {
      console.log(`Skipped ${storagePlantManagementResult.totalSkipped} plants.`);
    }
    if (storagePlantManagementResult.totalErrors > 0) {
      console.log(`Encountered ${storagePlantManagementResult.totalErrors} errors during plant management.`);
    }

    if (storagePlantManagementResult.refueled.didRefuelOil) {
      console.log(`Refueled oil plants to ${storagePlantManagementResult.refueled.pctRefueledOil}%.`);
    }
    if (storagePlantManagementResult.refueled.didRefuelNuclear) {
      console.log(`Refueled nuclear plants to ${storagePlantManagementResult.refueled.pctRefueledNuclear}%.`);
    }
    if (storagePlantManagementResult.refueled.didRefuelCoal) {
      console.log(`Refueled coal plants to ${storagePlantManagementResult.refueled.pctRefueledCoal}%.`);
    }

    if (storagePlantManagementResult.refueled.totalOutOfFuel > 0) {
      console.log(`${storagePlantManagementResult.refueled.totalOutOfFuel} plants were out of fuel.`);
    }
  }

  if (storagePlantManagementResult.reEnabledSolarPlants.enabledPlants > 0) {
    console.log(`Re-enabled ${storagePlantManagementResult.reEnabledSolarPlants.enabledPlants} solar plants.`);
  }

  // console.log(`Energy output: ${formatEnergy(storagePlantManagementResult.kwEnergyBefore)} -> ${formatEnergy(storagePlantManagementResult.kwEnergyAfter)}`);

  if (vesselInteractionsReport.length > 0) {
    console.log('\nVessel Activities:');
    vesselInteractionsReport.forEach(report => {
      console.log(generateVesselReport(report));
    });

    const oilSalesSummary = generateOilSalesSummary(vesselInteractionsReport, data.oilBuyPricePerKg);
    if (oilSalesSummary) {
      console.log('\n' + oilSalesSummary);
    }
  }

  console.log('\n');

  // if (ENHANCED_REPORTING) {

  //   // Top storage capacities
  //   const topStorages = data.energyGrids.filter(grid => grid.storages.some(storage => storage.plantsConnected > 0)).map(grid => {
  //     return {
  //       gridName: grid.gridName,
  //       totalCapacity: grid.totalCapacity
  //     };
  //   }).sort((a, b) => b.totalCapacity - a.totalCapacity);
  //   console.log('Top Storage Capacities:');
  //   topStorages.forEach(storage => {
  //     console.log(`${storage.gridName}: ${formatEnergy(storage.totalCapacity)}`);
  //   });

  //   await displayAverageFactors('cloudCover');
  //   await displayAverageFactors('output');
  //   await displayAverageFactors('windspeed');
  // }

}

function generateVesselReport(report: VesselInteractionReport): string {
  const parts = [
    `Vessel ${report.vesselName}:`,
    generateStatusChangeInfo(report),
    report.action,
    generateOilInfo(report),
    generateDestinationInfo(report),
  ];

  return parts.filter(Boolean).join(' ');
}

function generateOilSalesSummary(reports: VesselInteractionReport[], currentOilPrice: number): string | null {
  const oilSaleReport = reports.find(report => report.action === 'Sold oil' && report.soldValue !== undefined);

  if (oilSaleReport && oilSaleReport.oilOnboard !== undefined && oilSaleReport.soldValue !== undefined && oilSaleReport.soldValue !== null) {
    return `Oil Sales Summary:
Total oil sold: ${formatNumber(oilSaleReport.oilOnboard)} barrels
Total value: ${formatCurrency(oilSaleReport.soldValue)}
Current oil sell price: ${formatCurrency(currentOilPrice * 100)} per barrel (Threshold: ${formatCurrency(OIL_SELL_PRICE_THRESHOLD_MIN)})`;
  }

  return null;
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
