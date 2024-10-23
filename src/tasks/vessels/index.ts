import { Page } from "puppeteer";
import { GameSessionData, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { goToOilField } from "./goToOilField";
import { scanForOil } from "./scanForOil";
import { goToPortOrNextField } from "./goToPortOrNextField";
import { unloadOilAndTransferOrSell } from "./unloadOilAndTransferOrSell";
import { createVesselErrorReport } from "./vessel-helpers";

export async function vesselInteractions(page: Page, gameData: GameSessionData): Promise<VesselInteractionReport[]> {

  const vesselReports: VesselInteractionReport[] = [];
  const vesselsNeedingAction = gameData.vessels.filter(vessel => vessel.status !== VesselStatus.Enroute && vessel.status !== VesselStatus.Scanning && vessel.status !== VesselStatus.Drilling)

  for (const vessel of vesselsNeedingAction) {
    try {

      if (vessel.status === VesselStatus.InPort) {
        const report = await goToOilField(page, vessel);
        vesselReports.push(report);
      }

      if (vessel.status === VesselStatus.Anchored) {
        const report = await scanForOil(page, vessel);
        vesselReports.push(report);
      }

      if (vessel.status === VesselStatus.AnchoredWithOil) {
        const report = await goToPortOrNextField(page, vessel);
        vesselReports.push(report);
      }

      if (vessel.status === VesselStatus.InPortWithOil) {
        const report = await unloadOilAndTransferOrSell(page, vessel, gameData);
        vesselReports.push(report);


        // Then send on to oil field
        const departureReport = await goToOilField(page, vessel);
        vesselReports.push(departureReport);
      }

    } catch (error) {
      console.error(`Error processing vessel ${vessel.id}:`, error);
      vesselReports.push(createVesselErrorReport(vessel, "Error processing vessel"));
    }
  }

  return vesselReports;
}
