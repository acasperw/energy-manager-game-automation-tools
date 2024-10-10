import { Page } from "puppeteer";
import { DrillHistoryEntry, ScanPoint, VesselInfo, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { postApiData, fetchApiData } from "../../data/collector";
import { getSliderValuesFromString } from "../../utils/browser-data-helpers";
import { getDistanceFromLatLonInNm } from "./vessel-helpers";

export async function scanForOil(page: Page, vesselData: VesselInfo): Promise<VesselInteractionReport[]> {
  try {
    await postApiData<string>(page, `/status-vessel.php?id=${vesselData.id}`); // TODO: Check if this is necessary
    const drillHistories = Object.values(await fetchApiData<Record<string, DrillHistoryEntry>>(page, '/api/drill.history.php'));
    const scanStatusHtml = await postApiData<string>(page, `/status-vessel-operation.php?id=${vesselData.id}`);
    const { scanArea, maxRadius } = parseScanStatusHtml(scanStatusHtml);

    if (!scanArea || maxRadius === null) {
      throw new Error(`Failed to parse scan area or max radius for vessel ${vesselData.id}`);
    }

    const validScanPoint = findValidScanPoint(scanArea, drillHistories, maxRadius);

    if (!validScanPoint) {
      return [{
        vesselId: vesselData.id,
        vesselName: vesselData.vesselName,
        previousStatus: vesselData.status,
        newStatus: vesselData.status,
        action: "No valid scan points available",
        destination: null,
      }];
    }

    await initiateScan(page, vesselData.id, validScanPoint, maxRadius);

    return [{
      vesselId: vesselData.id,
      vesselName: vesselData.vesselName,
      previousStatus: vesselData.status,
      newStatus: VesselStatus.Scanning,
      action: `Scanned area at (${validScanPoint.lat}, ${validScanPoint.lon}) with radius ${maxRadius}m`,
      destination: null,
    }];

  } catch (error) {
    console.error(`Error in scanForOil for vessel ${vesselData.id}:`, error);
    return [];
  }
}

function parseScanStatusHtml(html: string): { scanArea: { north: number; south: number; east: number; west: number } | null; maxRadius: number | null } {
  const rectRegex = /outerFields\[\w+\]\s*=\s*L\.rectangle\(\[\s*\[([.\d]+),\s*([.\d-]+)\],\s*\[([.\d]+),\s*([.\d-]+)\]\s*\]/;
  const rectMatch = html.match(rectRegex);

  let scanArea = null;
  let maxRadius = null;

  if (rectMatch && rectMatch.length === 5) {
    const [lat1, lon1, lat2, lon2] = rectMatch.slice(1).map(Number);
    if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
      scanArea = {
        north: Math.max(lat1, lat2),
        south: Math.min(lat1, lat2),
        east: Math.max(lon1, lon2),
        west: Math.min(lon1, lon2)
      };
    }
  }

  maxRadius = getSliderValuesFromString(html).max ?? 25000;

  return { scanArea, maxRadius };
}

function findValidScanPoint(scanArea: { north: number; south: number; east: number; west: number }, drillHistories: DrillHistoryEntry[], maxRadius: number): ScanPoint | null {
  const { north, south, east, west } = scanArea;
  const scanRadiusNm = maxRadius / 1852; // Convert meters to nautical miles

  // Circles are next to each other
  // const gridSize = Math.min(scanRadiusNm, Math.min((north - south) / 10, (east - west) / 10));

  // Use scan radius as the grid size to allow for adjacent, potentially overlapping scans
  const gridSize = scanRadiusNm;

  for (let lat = north; lat >= south; lat -= gridSize) {
    for (let lon = west; lon <= east; lon += gridSize) {
      const point = { lat, lon };
      if (!isCenterPointWithinDrillHistory(point, drillHistories)) {
        return point;
      }
    }
  }

  return null;
}

function isCenterPointWithinDrillHistory(point: ScanPoint, drillHistories: DrillHistoryEntry[]): boolean {
  return drillHistories.some(history => {
    const distance = getDistanceFromLatLonInNm(point.lat, point.lon, history.lat, history.lon);
    return distance < history.radius / 1852; // Convert meters to nautical miles
    // Centers are next to each other
    // return distance <= (history.radius + maxRadius) / 1852; // Convert meters to nautical miles
  });
}

async function initiateScan(page: Page, vesselId: string, point: ScanPoint, radius: number): Promise<void> {
  const scanUrl = `/status-vessel-operation.php?mode=do&id=${vesselId}&lat=${point.lat}&lon=${point.lon}&radius=${radius}`;
  await postApiData<string>(page, scanUrl);
}
