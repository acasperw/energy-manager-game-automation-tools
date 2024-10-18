import { Page } from "puppeteer";
import { GameSessionData, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { goToOilField } from "./goToOilField";
import { scanForOil } from "./scanForOil"; // Import the scanForOil function
import { goToPortOrNextField } from "./goToPortOrNextField";
import { unloadOilAndTransferOrSell } from "./unloadOilAndTransferOrSell";

export async function vesselInteractions(page: Page, gameData: GameSessionData): Promise<VesselInteractionReport[]> {

  const vesselReports: VesselInteractionReport[] = [];
  const vesselsNeedingAction = gameData.vessels
    .filter(vessel => vessel.status !== VesselStatus.Enroute && vessel.status !== VesselStatus.Scanning && vessel.status !== VesselStatus.Drilling)
    .filter(vessel => vessel.id !== "16100"); // TEMPORARY: Skip a vessel for testing

  for (const vessel of vesselsNeedingAction) {
    try {

      if (vessel.status === VesselStatus.InPort) {
        const destination = await goToOilField(page, vessel);
        vesselReports.push({ vesselId: vessel.id, vesselName: vessel.vesselName, previousStatus: vessel.status, newStatus: VesselStatus.Enroute, action: 'Sent to oil field', destination: destination });
      }

      if (vessel.status === VesselStatus.Anchored) {
        const scanReports = await scanForOil(page, vessel);
        vesselReports.push(...scanReports);
      }

      if (vessel.status === VesselStatus.AnchoredWithOil) {
        // TODO: CHECK WHAT HAPPENS IF THE SHIP IS NOT FULLY LOADED
        //
        // const destination = await goToPortOrNextField(page, vessel);
        // vesselReports.push({ vesselId: vessel.id, vesselName: vessel.vesselName, previousStatus: vessel.status, newStatus: VesselStatus.Enroute, action: 'Sent to port', destination });
      }

      if (vessel.status === VesselStatus.InPortWithOil) {
        const result = await unloadOilAndTransferOrSell(page, vessel, gameData);
        vesselReports.push(result);

        // Then send on to oil field if not full
        if (vessel.oilOnboard === 0) {
          const destination = await goToOilField(page, vessel);
          vesselReports.push({ vesselId: vessel.id, vesselName: vessel.vesselName, previousStatus: vessel.status, newStatus: VesselStatus.Enroute, action: 'Sent to oil field', destination });
        }
      }

    } catch (error) {
      console.error(`Error processing vessel ${vessel.id}:`, error);
    }
  }

  return vesselReports;
}
