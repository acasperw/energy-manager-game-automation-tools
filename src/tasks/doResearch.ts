import { Page } from "puppeteer";
import { GameSessionData, ResearchInfo } from "../types/interface";
import { RESEARCH_BUDGET_PERCENTAGE } from "../config";

/**
 * Performs research actions based on available research stations and prioritized research list.
 * @param page - Puppeteer Page instance.
 * @param data - Parsed game session data containing research information and user money.
 * @returns The number of successful research actions performed.
 */
export async function doResearch(page: Page, data: GameSessionData): Promise<number> {
  const { availableResearchStations, researchData } = data.research;
  const researchBudget = data.userMoney * RESEARCH_BUDGET_PERCENTAGE;

  if (availableResearchStations <= 0 || researchData.length === 0) {
    return 0;
  }

  const affordableResearch = researchData.filter(research => research.price <= researchBudget);
  if (affordableResearch.length === 0) {
    return 0;
  }

  const orderedResearchList = getOrderedResearchList({
    ...data,
    research: { ...data.research, researchData: affordableResearch }
  });

  const researchesToDo: ResearchInfo[] = [];
  let stationsUsed = 0;
  let budgetUsed = 0;

  for (const research of orderedResearchList) {
    if (stationsUsed >= availableResearchStations || budgetUsed + research.price > researchBudget) {
      break;
    }

    researchesToDo.push(research);
    budgetUsed += research.price;
    stationsUsed++;
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
  vesselResearchIds: [22, 23, 24, 25], // Vessel-Related Research IDs
  oilResearchIds: [26, 12, 14],    // Oil-Related Research IDs
  stockResearchIds: [5, 6, 7, 8],  // Stock-Related Research IDs
};

function getOrderedResearchList(data: GameSessionData): ResearchInfo[] {
  const { researchData } = data.research;
  const plants = data.plants;
  const hasOilPlants = plants.some((plant) => plant.plantType === "fossil");
  const hasVessels = data.vessels.length > 0;

  const { priorityList, vesselResearchIds, oilResearchIds, stockResearchIds } = priorityConfig;

  // Define priority groups
  const priorityGroups: { group: number; ids: number[]; condition?: boolean }[] = [
    { group: 1, ids: priorityList },
    { group: 2, ids: vesselResearchIds, condition: hasVessels },
    { group: 3, ids: oilResearchIds, condition: hasOilPlants },
    { group: 5, ids: stockResearchIds }, // Lower priority
  ];

  const DEFAULT_GROUP = 4; // Medium priority

  // Assign priority group to each research item
  const prioritizedResearch = researchData.map((research) => {
    let assignedGroup = DEFAULT_GROUP;

    for (const group of priorityGroups) {
      if (group.ids.includes(research.id) && (group.condition === undefined || group.condition)) {
        assignedGroup = group.group;
        break;
      }
    }

    return { ...research, priorityGroup: assignedGroup };
  });

  // Sort based on priorityGroup
  const sortedResearch = prioritizedResearch.sort(
    (a, b) => a.priorityGroup - b.priorityGroup
  );

  return sortedResearch;
}
