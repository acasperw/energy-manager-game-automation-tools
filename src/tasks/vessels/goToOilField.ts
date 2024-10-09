import { Page } from "puppeteer";
import { ProcessedVesselStatus, VesselDestinationInfo, VesselInfo } from "../../types/interface";
import { postApiData } from "../../data/collector";
import { getSliderValuesFromString } from "../../utils/browser-data-helpers";

import * as cheerio from 'cheerio';


/**
 * Sends the vessel to the closest oil field port based on distance.
 * @param page Puppeteer Page instance
 * @param vesselData Information about the vessel
 */
export async function goToOilField(page: Page, vesselData: VesselInfo): Promise<VesselDestinationInfo> {

  // Fetch vessel status HTML
  const vesselStatusHtml = await postApiData<string>(page, `/status-vessel.php?id=${vesselData.id}`);
  const { ports, maxSpeed } = processVesselStatus(vesselStatusHtml);

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

/**
 * Parses the vessel status HTML to extract port information and slider max speed.
 * @param html HTML content of the vessel status page
 * @returns An object containing an array of VesselDestinationInfo and the maxSpeed
 */
function processVesselStatus(html: string): ProcessedVesselStatus {
  const $ = cheerio.load(html);
  const ports: VesselDestinationInfo[] = [];

  // Extract ports from the #dest-selector
  $('#dest-selector option').each((_, element) => {
    const option = $(element);
    const value = option.attr('value');

    if (!value || value.trim() === '' || option.text().includes('Select destination')) {
      return;
    }

    const [idStr, fuelStr, distanceStr, opTimeStr, reverseStr] = value.split(',');
    const port: VesselDestinationInfo = {
      id: idStr.trim(),
      name: option.text().trim(),
      distance: parseFloat(distanceStr.trim())
    };

    if (isNaN(port.distance)) {
      console.warn(`Invalid distance for port ${port.name} (ID: ${port.id})`);
      return;
    }

    ports.push(port);
  });

  const { min, max, value } = getSliderValuesFromString(html);
  return { ports, maxSpeed: max };
}
