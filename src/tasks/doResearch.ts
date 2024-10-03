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

  const orderedResearchList = getOrderedResearchList(data);

  const researchesToDo: ResearchInfo[] = [];
  let stationsUsed = 0;

  for (const research of orderedResearchList) {
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

const priorityConfig = {
  priorityList: [182, 181, 3, 1], // High Priority IDs
  oilResearchIds: [26, 12, 14],    // Oil-Related Research IDs
  stockResearchIds: [5, 6, 7, 8],  // Stock-Related Research IDs
};

function getOrderedResearchList(data: GameSessionData): ResearchInfo[] {
  const { researchData } = data.research;
  const plants = data.plants;
  const hasOilPlants = plants.some((plant) => plant.plantType === "fossil");

  const { priorityList, oilResearchIds, stockResearchIds } = priorityConfig;

  // Define priority groups
  const priorityGroups: { group: number; ids: number[] }[] = [
    { group: 1, ids: priorityList },
    { group: 2, ids: oilResearchIds },
    { group: 4, ids: stockResearchIds }, // Lower priority
  ];

  const DEFAULT_GROUP = 3; // Medium priority

  // Assign priority group to each research item
  const prioritizedResearch = researchData.map((research) => {
    let assignedGroup = DEFAULT_GROUP;

    for (const group of priorityGroups) {
      if (group.ids.includes(research.id)) {
        assignedGroup = group.group;
        break;
      }
    }

    // If the user doesn't have oil plants, demote oil-related researches
    if (!hasOilPlants && oilResearchIds.includes(research.id)) {
      assignedGroup = DEFAULT_GROUP;
    }

    return { ...research, priorityGroup: assignedGroup };
  });

  // Sort based on priorityGroup
  const sortedResearch = prioritizedResearch.sort(
    (a, b) => a.priorityGroup - b.priorityGroup
  );

  return sortedResearch;
}
