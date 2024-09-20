import { pctOfMaxPrice_other_grid_THRESHOLD_MIN } from "../config";
import { GridStorage } from "../types/interface";

export function filterGridsByStorageType(grids: GridStorage[], storageType: 'p2x' | 'non-p2x'): GridStorage[] {
  return grids.filter(grid =>
    grid.storages.some(storage =>
      storageType === 'p2x' ? storage.type === 'p2x' : storage.type !== 'p2x'
    )
  );
}

export function calculateGridChargePercentage(grid: GridStorage, storageType: 'p2x' | 'non-p2x'): number {
  const relevantStorages = grid.storages.filter(storage =>
    (storageType === 'p2x' ? storage.type === 'p2x' : storage.type !== 'p2x') &&
    storage.plantsConnected > 0
  );

  const totalCharge = relevantStorages.reduce((sum, storage) => sum + storage.currentCharge, 0);
  const totalCapacity = relevantStorages.reduce((sum, storage) => sum + storage.capacity, 0);

  return totalCapacity > 0 ? (totalCharge / totalCapacity) * 100 : 0;
}

export function isGridChargeAboveThreshold(grid: GridStorage, storageType: 'p2x' | 'non-p2x', threshold: number): boolean {
  const chargePercentage = calculateGridChargePercentage(grid, storageType);
  return chargePercentage > threshold;
}

export function getAllEligibleEnergyGridsWeCanSellTo(energyGrids: GridStorage[]): GridStorage[] {
  return energyGrids
    .filter(grid => grid.pctOfMaxPrice > pctOfMaxPrice_other_grid_THRESHOLD_MIN)
    .filter(grid => !grid.isLowDemand)
    .sort((a, b) => b.mwhValue - a.mwhValue);
}
