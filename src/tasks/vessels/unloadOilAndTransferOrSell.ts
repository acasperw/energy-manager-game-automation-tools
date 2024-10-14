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
    soldValue: null,
    oilOnboard: vesselData.oilOnboard
  };

  const oilSellPricePerBbl = gameData.oilBuyPricePerKg * 100; // Price per bbl

  // const commoditiesBuyHtml = await postApiData<string>(page, `/commodities-sell.php`);
  // const { holding, capacity } = parseCommoditiesBuyHtml(commoditiesBuyHtml);

  const commoditiesSellHtml = await postApiData<string>(page, `/commodities-sell.php`);
  const { bblOnShips, bblCapacity } = parseCommoditiesSellHtml(commoditiesSellHtml);

  if (oilSellPricePerBbl > OIL_SELL_PRICE_THRESHOLD_MIN) {
    // Sell all oil on ships
    await postApiData<string>(page, `commodities-sell.php?mode=do&type=sell&amount=${bblOnShips}`);
    vesselInteractionReport.soldValue = oilSellPricePerBbl * bblOnShips * 100; // 1 bbl is 100 kg
    vesselInteractionReport.action = 'Sold oil';
  } else {
    // Transfer oil, but only up to the available capacity
    const transferAmount = Math.min(bblOnShips, bblCapacity);
    await postApiData<string>(page, `commodities-sell.php?mode=do&type=transfer&amount=${transferAmount}`);
    vesselInteractionReport.action = 'Transferred oil';
    if (transferAmount < bblOnShips) {
      vesselInteractionReport.action += ` (${bblOnShips - transferAmount} barrels remaining on ship due to capacity limit)`;
    }
  }

  return vesselInteractionReport;
}

function parseCommoditiesSellHtml(html: string): { bblOnShips: number; bblCapacity: number } {
  const bblCapacityRegex = /bblCapacity\s*=\s*(\d+)/;
  const bblCapacityMatch = html.match(bblCapacityRegex);
  const bblCapacity = bblCapacityMatch ? parseInt(bblCapacityMatch[1], 10) : 0;

  const bblOnShips = getSliderValuesFromString(html).max;
  return { bblOnShips, bblCapacity };
}

