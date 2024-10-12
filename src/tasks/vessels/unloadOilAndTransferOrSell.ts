import { Page } from "puppeteer";
import { GameSessionData, VesselInfo, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { postApiData } from "../../utils/api-requests";
import { getSliderValuesFromString } from "../../utils/browser-data-helpers";
import { OIL_SELL_PRICE_THRESHOLD_MIN } from "../../config";

export async function unloadOilAndTransferOrSell(page: Page, vesselData: VesselInfo, gameData: GameSessionData): Promise<VesselInteractionReport> {

  const vesselInteractionReport: VesselInteractionReport = {
    vesselId: vesselData.id,
    vesselName: vesselData.vesselName,
    previousStatus: vesselData.status,
    newStatus: VesselStatus.InPort,
    action: 'Unload oil and transfer or sell',
    destination: null,
    soldValue: null
  };

  const oilSellPrice = gameData.oilBuyPrice * 100; // Price per bbl

  // const commoditiesBuyHtml = await postApiData<string>(page, `/commodities-sell.php`);
  // const { holding, capacity } = parseCommoditiesBuyHtml(commoditiesBuyHtml);

  const commoditiesSellHtml = await postApiData<string>(page, `/commodities-sell.php`);
  const { bblOnShips, bblCapacity } = parseCommoditiesSellHtml(commoditiesSellHtml);

  if (oilSellPrice > OIL_SELL_PRICE_THRESHOLD_MIN) {
    await postApiData<string>(page, `commodities-sell.php?mode=do&type=sell&amount=${bblOnShips}`);
    vesselInteractionReport.soldValue = oilSellPrice * bblOnShips * 100;
    vesselInteractionReport.action = 'Sold oil';
  } else {
    await postApiData<string>(page, `commodities-sell.php?mode=do&type=transfer&amount=${bblOnShips}`);
    vesselInteractionReport.action = 'Transferred oil';
  }

  return vesselInteractionReport;
}


function parseCommoditiesSellHtml(html: string): { bblOnShips: number; bblCapacity: number | null } {

  const bblCapacityRegex = /bblCapacity\s*=\s*(\d+)/;
  const bblCapacityMatch = html.match(bblCapacityRegex);
  const bblCapacity = parseInt(bblCapacityMatch![1], 10);

  const bblOnShips = getSliderValuesFromString(html).max;
  return { bblOnShips, bblCapacity };
}

// function parseCommoditiesBuyHtml(html: string): { holding: number | null, capacity: number | null } {

//   // const bblAmount = getSliderValuesFromString(html).max;
//   return { holding, capacity };
// }