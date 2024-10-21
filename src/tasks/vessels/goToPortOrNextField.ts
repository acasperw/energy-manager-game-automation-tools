import { Page } from "puppeteer";
import { VesselInfo, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { postApiData } from "../../utils/api-requests";
import { createVesselErrorReport, createVesselReport, processVesselStatus } from "./vessel-helpers";

export async function goToPortOrNextField(page: Page, vesselData: VesselInfo): Promise<VesselInteractionReport> {
  const vesselStatusHtml = await postApiData<string>(page, `/status-vessel.php?id=${vesselData.id}`);
  const { ports, maxSpeed } = processVesselStatus(vesselStatusHtml);

  if (ports.length === 0) {
    console.error(`No ports found for vessel ${vesselData.id}`);
    return createVesselErrorReport(vesselData, `No ports found for vessel ${vesselData.id}`);
  }

  const closestDest = ports.reduce((prev, curr) => (curr.distance < prev.distance ? curr : prev), ports[0]);
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
