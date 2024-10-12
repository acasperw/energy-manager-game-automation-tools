import { Page } from "puppeteer";
import { VesselInfo, VesselDestinationInfo } from "../../types/interface";
import { postApiData } from "../../utils/api-requests";
import { processVesselStatus } from "./vessel-helpers";

/**
 * Sends the vessel to the closest oil field or port based on distance.
 * @param page Puppeteer Page instance
 * @param vesselData Information about the vessel
 */
export async function goToPortOrNextField(page: Page, vesselData: VesselInfo): Promise<VesselDestinationInfo> {

  const vesselStatusHtml = await postApiData<string>(page, `/status-vessel.php?id=${vesselData.id}`);
  const { ports, maxSpeed } = processVesselStatus(vesselStatusHtml);

  // TODO: CHECK WHAT HAPPENS IF THE SHIP IS NOT FULLY LOADED

  if (ports.length === 0) {
    console.error(`No ports found for vessel ${vesselData.id}`);
    return { id: '', name: '', distance: 0 };
  }

  const closestDest = ports.reduce((prev, curr) => (curr.distance < prev.distance ? curr : prev), ports[0]);
  const sendSpeed = maxSpeed !== null ? maxSpeed : 16;

  const sendVesselUrl = `/vessel-depart.php?vesselId=${vesselData.id}&destination=${closestDest.id}&speed=${sendSpeed}`;
  try {
    await postApiData<string>(page, sendVesselUrl);
  } catch (error) {
    console.error(`Failed to send vessel ${vesselData.id} to port ${closestDest.name}:`, error);
  }

  return closestDest;
}
