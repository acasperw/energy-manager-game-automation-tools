import { Page } from "puppeteer";
import { VesselInfo, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { postApiData } from "../../utils/api-requests";
import { createVesselErrorReport, createVesselReport, processVesselStatus } from "./vessel-helpers";
import { scanForOil } from "./scanForOil";
import { isOilFieldDepleted } from "../../utils/data-storage";

export async function goToPortOrNextField(page: Page, vesselData: VesselInfo): Promise<VesselInteractionReport> {
  const vesselStatusHtml = await postApiData<string>(page, `/status-vessel.php?id=${vesselData.id}`);
  const { ports, maxSpeed, fillPercentage } = processVesselStatus(vesselStatusHtml);

  if (fillPercentage !== null && fillPercentage < 100) {
    // Check if the current field is depleted to avoid infinite loop
    if (await isOilFieldDepleted(vesselData.fieldLoc)) {
      console.log(`Field ${vesselData.fieldLoc} is depleted. Sending vessel ${vesselData.id} to the nearest port.`);
    } else {
      return await scanForOil(page, vesselData);
    }
  }

  const validPorts = [];
  for (const port of ports) {
    if (!(await isOilFieldDepleted(port.id))) {
      validPorts.push(port);
    }
  }

  if (validPorts.length === 0) {
    console.error(`No valid ports found for vessel ${vesselData.id}`);
    return createVesselErrorReport(vesselData, `No valid ports found for vessel ${vesselData.id}`);
  }

  const closestDest = validPorts.reduce((prev, curr) => (curr.distance < prev.distance ? curr : prev), validPorts[0]);
  const sendSpeed = maxSpeed !== null ? maxSpeed : 16;

  const sendVesselUrl = `/vessel-depart.php?vesselId=${vesselData.id}&destination=${closestDest.id}&speed=${sendSpeed}`;
  try {
    await postApiData<string>(page, sendVesselUrl);
    return createVesselReport(vesselData, VesselStatus.Enroute, "Sent to port or next field", closestDest);
  } catch (error) {
    console.error(`Failed to send vessel ${vesselData.id} to port ${closestDest.name}:`, error);
    return createVesselErrorReport(vesselData, `Failed to send vessel ${vesselData.id} to port ${closestDest.name}:`);
  }
}
