import { Plant } from "./api";

export type tabName = 'plants' | 'storage';

export interface TaskDecisions {
  sellEnergy: boolean;
  sellHydrogen: boolean;
  buyCo2Quotas: boolean;
  enableStoragesPlants: boolean;
  reenableSolarPlants: boolean;
}

export interface StorageInfo {
  id: string;
  type: 'p2x' | 'chemical' | 'gravity';
  currentCharge: number;
  capacity: number;
}

export interface GridStorage {
  gridId: string;
  gridName: string;
  storages: StorageInfo[];
  mwhValue: number;
  pctOfMaxPrice: number;
  demand: number;
  isLowDemand: boolean;
  totalCurrentCharge: number;
  totalCapacity: number;
  chargePercentage: number;
  discharging: boolean;
}

export interface GameSessionData {
  plants: Plant[];
  energyGrids: GridStorage[];
  hydrogenValue: number;
  emissionPerKwh: number;
  co2Value: number;
}

export interface EnergySalesProcess {
  processedGrids: number;
  processedGridsResults: EnergySalesInfo[];
}

export interface EnergySalesInfo {
  gridName: string;
  sale: number;
  additionalProfit: number;
  action: 'keep' | 'sold' | 'skipped';
  soldTo?: string | null;
  highUpcomingValue?: boolean;
}

export interface HydrogenSalesInfo {
  sale: number;
  includingSilo: boolean;
}