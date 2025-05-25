import { Page } from "puppeteer";
import { postApiData } from "../utils/api-requests";

export type MaintenanceTarget = "plant" | "storage";

export interface MaintenanceResult {
  targetType: MaintenanceTarget;
  id: string | number;
  success: boolean;
  error?: any;
}

/**
 * Performs maintenance on a single plant or storage by ID.
 * @param page Puppeteer page
 * @param targetType "plant" or "storage"
 * @param id Plant or storage ID
 * @returns MaintenanceResult
 */
export async function performMaintenance(
  page: Page,
  targetType: MaintenanceTarget,
  id: string | number
): Promise<MaintenanceResult> {
  try {
    await postApiData<string>(page, `/maintenance.php?type=${targetType}&id=${id}&mode=do`);
    return { targetType, id, success: true };
  } catch (error) {
    return { targetType, id, success: false, error };
  }
}
