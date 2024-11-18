// utils/factorsTracker.ts

import fs from 'fs/promises';
import path from 'path';
import { FactorsSummary } from '../types/data-storage';
import { GameSessionData } from '../types/interface';

const SUMMARY_FILE_PATH = path.resolve('energy_data/factorsSummary.json');
const DEPLETED_FIELDS_FILE_PATH = path.resolve('energy_data/depletedOilFields.json');

interface DepletedOilField {
  fieldId: string;
  depletedDate: string;
}

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


/**
 * Extracts multiple factors per grid from the fetched user and production data.
 * Ensures that cloudCover and windspeed are added only once per grid per run.
 * Aggregates output across all plants within the same grid.
 *
 * @param data - The game session data containing plants and energy grids.
 * @returns An object mapping grid IDs to their current factors.
 */
export function extractFactorsPerGrid(data: GameSessionData): Record<string, Record<string, number>> {
  const factorsData: Record<string, Record<string, number>> = {};

  // Create a mapping from storageId (string) to gridName for quick lookup
  const storageIdToGridName: Record<string, string> = {};

  data.energyGrids.forEach(grid => {
    grid.storages.forEach(storage => {
      storageIdToGridName[storage.id] = grid.gridName;
    });
  });

  data.plants.forEach(plant => {
    const storageId = plant.storageId.toString(); // Ensure storageId is a string
    const gridName = storageIdToGridName[storageId];

    if (!gridName) {
      console.warn(`No grid found for storage ID: ${storageId}`);
      return; // Skip plants without a valid grid association
    }

    if (!factorsData[gridName]) {
      factorsData[gridName] = {};
    }

    // Add cloudCover and windspeed once per grid
    if (!factorsData[gridName]['cloudCover']) {
      factorsData[gridName]['cloudCover'] = plant.cloudcover || 0;
    }

    if (!factorsData[gridName]['windspeed']) {
      factorsData[gridName]['windspeed'] = plant.windspeed || 0;
    }

    // Aggregate output across all plants within the grid
    factorsData[gridName]['output'] = (factorsData[gridName]['output'] || 0) + (plant.output || 0);
  });

  return factorsData;
}

export async function loadDepletedOilFields(): Promise<DepletedOilField[]> {
  try {
    const data = await fs.readFile(DEPLETED_FIELDS_FILE_PATH, 'utf-8');
    return JSON.parse(data) as DepletedOilField[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File does not exist, create an empty file and return an empty array
      await fs.writeFile(DEPLETED_FIELDS_FILE_PATH, '[]', 'utf-8');
      return [];
    }
    throw error;
  }
}

export async function saveDepletedOilFields(fields: DepletedOilField[]): Promise<void> {
  const data = JSON.stringify(fields, null, 2);
  await fs.writeFile(DEPLETED_FIELDS_FILE_PATH, data, 'utf-8');
}

/**
 * Marks an oil field as depleted and saves it to the JSON file.
 * @param fieldId - The ID of the depleted oil field.
 */
export async function markOilFieldAsDepleted(fieldId: string): Promise<void> {
  const depletedFields = await loadDepletedOilFields();
  const depletedDate = new Date().toISOString();

  // Check if the field is already marked as depleted
  if (!depletedFields.some(field => field.fieldId === fieldId)) {
    depletedFields.push({ fieldId, depletedDate });
    await saveDepletedOilFields(depletedFields);
  }
}

/**
 * Cleans up old entries from the depleted oil fields list.
 */
export async function cleanUpDepletedOilFields(): Promise<void> {
  const depletedFields = await loadDepletedOilFields();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const cleanedFields = depletedFields.filter(field => new Date(field.depletedDate) > oneMonthAgo);
  await saveDepletedOilFields(cleanedFields);
}

/**
 * Checks if an oil field is depleted.
 * @param fieldId - The ID of the oil field to check.
 * @returns True if the field is depleted, false otherwise.
 */
export async function isOilFieldDepleted(fieldId: string): Promise<boolean> {
  await cleanUpDepletedOilFields();
  const depletedFields = await loadDepletedOilFields();
  return depletedFields.some(field => field.fieldId === fieldId);
}
