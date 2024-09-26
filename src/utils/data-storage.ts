// utils/factorsTracker.ts

import fs from 'fs/promises';
import path from 'path';
import { FactorsSummary } from '../types/data-storage';
import { GameSessionData } from '../types/interface';

const SUMMARY_FILE_PATH = path.resolve('energy_data/factorsSummary.json');

/**
 * Loads the existing factors summary from the JSON file.
 * If the file does not exist or is corrupted, returns an empty summary.
 */
export async function loadFactorsSummary(): Promise<FactorsSummary> {
  try {
    const data = await fs.readFile(SUMMARY_FILE_PATH, 'utf-8');
    return JSON.parse(data) as FactorsSummary;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File does not exist, return empty summary
      return {};
    } else if (error instanceof SyntaxError) {
      console.error('Malformed JSON in factorsSummary.json. Initializing a new summary.');
      // Backup corrupted file
      await fs.rename(SUMMARY_FILE_PATH, `${SUMMARY_FILE_PATH}.backup`);
      return {};
    }
    throw error;
  }
}

/**
 * Saves the factors summary to the JSON file.
 * @param summary - The updated factors summary.
 */
export async function saveFactorsSummary(summary: FactorsSummary): Promise<void> {
  const data = JSON.stringify(summary, null, 2);
  await fs.writeFile(SUMMARY_FILE_PATH, data, 'utf-8');
}

/**
 * Updates the factors summary with the current run's data.
 * @param currentRunData - An object mapping grid IDs to their current factors.
 *                         Each grid maps to an object of factor name to value.
 */
export async function updateFactorsSummary(currentRunData: Record<string, Record<string, number>>): Promise<void> {
  const summary = await loadFactorsSummary();

  for (const [gridId, factors] of Object.entries(currentRunData)) {
    if (!summary[gridId]) {
      summary[gridId] = {};
    }

    for (const [factor, value] of Object.entries(factors)) {
      if (!summary[gridId][factor]) {
        summary[gridId][factor] = {
          total: value,
          instances: 1,
        };
      } else {
        summary[gridId][factor].total += value;
        summary[gridId][factor].instances += 1;
      }
    }
  }

  await saveFactorsSummary(summary);
}

/**
 * Calculates the average for each factor per grid.
 * @returns An object mapping grid IDs to their average factors.
 */
export async function getAverageFactors(): Promise<Record<string, Record<string, number>>> {
  const summary = await loadFactorsSummary();
  const averages: Record<string, Record<string, number>> = {};

  for (const [gridId, factors] of Object.entries(summary)) {
    averages[gridId] = {};
    for (const [factor, data] of Object.entries(factors)) {
      averages[gridId][factor] = data.total / data.instances;
    }
  }

  return averages;
}

/**
 * Displays the average factors per grid.
 * If a factor name is provided, it displays a sorted list based on that factor.
 * @param factorName - The name of the factor to display and sort by (optional).
 */
export async function displayAverageFactors(factorName?: string): Promise<void> {
  const averages = await getAverageFactors();

  if (factorName) {
    const sortedGrids: Array<{ gridId: string; average: number }> = [];

    for (const [gridId, factors] of Object.entries(averages)) {
      if (factors.hasOwnProperty(factorName)) {
        sortedGrids.push({ gridId, average: factors[factorName] });
      }
    }

    if (sortedGrids.length === 0) {
      console.log(`\nNo data found for factor '${factorName}'.\n`);
      return;
    }

    // Sort the grids by average in descending order
    sortedGrids.sort((a, b) => b.average - a.average);

    console.log(`\n----- Average '${factorName}' per Grid (Sorted Descending) -----`);
    sortedGrids.forEach(({ gridId, average }) => {
      console.log(`Grid: ${gridId}, Average ${factorName}: ${average.toFixed(2)}`);
    });
    console.log('--------------------------------------------------------------\n');
  } else {
    // Display all factors as before
    console.log('\n----- Average Factors per Grid -----');
    for (const [gridId, factors] of Object.entries(averages)) {
      console.log(`Grid: ${gridId}`);
      for (const [factor, average] of Object.entries(factors)) {
        console.log(`  ${factor}: ${average.toFixed(2)}`);
      }
    }
    console.log('------------------------------------\n');
  }
}


export function extractFactorsPerGrid(data: GameSessionData): Record<string, Record<string, number>> {
  const factorsData: Record<string, Record<string, number>> = {};

  data.plants.forEach(plant => {
    const storageId = plant.storageId.toString();
    const gridId = data.energyGrids.find(grid => grid.storages.some(storage => storage.id === storageId))?.gridName!;

    if (!factorsData[gridId]) {
      factorsData[gridId] = {};
    }

    // Extract and accumulate factors. Adjust the keys based on actual API response.
    const cloudCover = plant.cloudcover || 0; // Assuming 'cloudcover' exists in plant data
    const windspeed = plant.windspeed || 0;   // Assuming 'windspeed' exists
    const output = plant.output || 0;         // Assuming 'output' exists

    factorsData[gridId]['cloudCover'] = (factorsData[gridId]['cloudCover'] || 0) + cloudCover;
    factorsData[gridId]['windspeed'] = (factorsData[gridId]['windspeed'] || 0) + windspeed;
    factorsData[gridId]['output'] = (factorsData[gridId]['output'] || 0) + output;
  });

  return factorsData;
}
