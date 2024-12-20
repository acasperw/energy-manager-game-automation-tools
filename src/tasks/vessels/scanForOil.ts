import { Page } from "puppeteer";
import { DrillHistoryEntry, ScanPoint, VesselInfo, VesselInteractionReport, VesselStatus } from "../../types/interface";
import { getSliderValuesFromString } from "../../utils/browser-data-helpers";
import { calculateDistance, createVesselErrorReport, createVesselReport } from "./vessel-helpers";
import { fetchApiData, postApiData } from "../../utils/api-requests";
import { markOilFieldAsDepleted } from "../../utils/data-storage";
import { goToPortOrNextField } from "./goToPortOrNextField";

export async function scanForOil(page: Page, vesselData: VesselInfo): Promise<VesselInteractionReport> {
  try {
    const drillHistories = Object.values(await fetchApiData<Record<string, DrillHistoryEntry>>(page, '/api/drill.history.php'));
    const scanStatusHtml = await postApiData<string>(page, `/status-vessel-operation.php?id=${vesselData.id}`);
    const { scanArea, maxRadius } = parseScanStatusHtml(scanStatusHtml);

    if (!scanArea || maxRadius === null) {
      throw new Error(`Failed to parse scan area or max radius for vessel ${vesselData.id}`);
    }

    const validScanPoint = findValidScanPoint(scanArea, drillHistories, maxRadius);

    if (!validScanPoint) {
      await markOilFieldAsDepleted(vesselData.fieldLoc);
      return await goToPortOrNextField(page, vesselData);
    }

    await initiateScan(page, vesselData.id, validScanPoint, maxRadius);
    return createVesselReport(vesselData, VesselStatus.Scanning, `Scanned area at (${validScanPoint.lat}, ${validScanPoint.lon})`, null);

  } catch (error) {
    console.error(`Error in scanForOil for vessel ${vesselData.id}:`, error);
    return createVesselErrorReport(vesselData, "Error occurred during scan");
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

  const gridSize = Math.min(scanRadiusNm, Math.min(Math.abs(north - south) / 10, Math.abs(east - west) / 10));

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
    const distance = calculateDistance(point.lat, point.lon, history.lat, history.lon);
    return distance <= history.radius / 1852; // Convert meters to nautical miles
  });
}

async function initiateScan(page: Page, vesselId: string, point: ScanPoint, radius: number): Promise<void> {
  const scanUrl = `/status-vessel-operation.php?mode=do&id=${vesselId}&lat=${point.lat}&lon=${point.lon}&radius=${radius}`;
  await postApiData<string>(page, scanUrl);
}
