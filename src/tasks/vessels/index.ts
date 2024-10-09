import { Page } from "puppeteer";
import { GameSessionData, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { goToOilField } from "./goToOilField";
import { scanForOil } from "./scanForOil"; // Import the scanForOil function

export async function vesselInteractions(page: Page, data: GameSessionData): Promise<VesselInteractionReport[]> {

  const vesselReports: VesselInteractionReport[] = [];
  const vesselsNeedingAction = data.vessels.filter(vessel => vessel.status !== VesselStatus.Enroute && vessel.status !== VesselStatus.Scanning && vessel.status !== VesselStatus.Drilling);

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
        // await goToPortOrNextField(page, vessel);
      }

      if (vessel.status === VesselStatus.InPortWithOil) {
        // await unloadOil(page, vessel);
      }

    } catch (error) {
      console.error(`Error processing vessel ${vessel.id}:`, error);
    }
  }

  return vesselReports;
}
