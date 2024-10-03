import { Page } from "puppeteer";
import { GameSessionData, ResearchInfo } from "../types/interface";

/**
 * Performs research actions based on available research stations and prioritized research list.
 * @param page - Puppeteer Page instance.
 * @param data - Parsed game session data containing research information and user money.
 * @returns The number of successful research actions performed.
 */
export async function doResearch(page: Page, data: GameSessionData): Promise<number> {
  const { availableResearchStations, researchData } = data.research;
  let userMoney = data.userMoney;

  if (availableResearchStations <= 0) {
    return 0;
  }

  // Define the priority list
  const priorityList: number[] = [182, 181, 3, 1];

  // Sort researchData based on priority
  const sortedResearchData = [...researchData].sort((a, b) => {
    const priorityA = priorityList.indexOf(a.id);
    const priorityB = priorityList.indexOf(b.id);

    if (priorityA !== -1 && priorityB !== -1) {
      return priorityA - priorityB; // Both have priority, sort accordingly
    } else if (priorityA !== -1) {
      return -1; // Only a has priority
    } else if (priorityB !== -1) {
      return 1; // Only b has priority
    } else {
      return 0; // Neither has priority, keep original order
    }
  });

  const researchesToDo: ResearchInfo[] = [];
  let stationsUsed = 0;

  // Iterate through sortedResearchData and select affordable researches
  for (const research of sortedResearchData) {
    if (stationsUsed >= availableResearchStations) {
      break;
    }

    if (research.price <= userMoney) {
      researchesToDo.push(research);
      userMoney -= research.price;
      stationsUsed++;
    }
  }

  if (researchesToDo.length === 0) {
    return 0;
  }

  // Function to perform research for a single item
  const performResearch = async (id: number): Promise<boolean> => {
    try {
      const response = await page.evaluate(async (researchId: number) => {
        const url = `/research-do.php?id=${researchId}`;
        const fetchResponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        return { status: fetchResponse.status, ok: fetchResponse.ok, };
      }, id);

      if (response.ok) {
        console.log(`Research ID ${id} completed successfully.`);
        return true;
      } else {
        console.warn(`Research ID ${id} failed with status ${response.status}.`);
        return false;
      }
    } catch (error) {
      console.error(`Error performing research ID ${id}:`, error);
      return false;
    }
  };

  // Perform all research actions concurrently
  const researchPromises = researchesToDo.map(research => performResearch(research.id));
  const results = await Promise.all(researchPromises);

  // Count the number of successful researches
  const successfulResearches = results.filter(result => result).length;

  return successfulResearches;
}
