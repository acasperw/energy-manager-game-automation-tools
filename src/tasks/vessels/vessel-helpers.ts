import { ProcessedVesselStatus, VesselDestinationInfo } from "../../types/interface";
import { getSliderValuesFromString } from "../../utils/browser-data-helpers";
import * as cheerio from 'cheerio';

export function getDistanceFromLatLonInNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Radius of the Earth in nautical miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Parses the vessel status HTML to extract Oil field or port destinations and slider max speed.
 * @param html HTML content of the vessel status page
 * @returns An object containing an array of VesselDestinationInfo and the maxSpeed
 */
export function processVesselStatus(html: string): ProcessedVesselStatus {
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

  const { max } = getSliderValuesFromString(html);
  return { ports, maxSpeed: max };
}
