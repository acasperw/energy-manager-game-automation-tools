import { Plant } from "./api";

export type tabName = 'plants' | 'storage';

export interface TaskDecisions {
  sellEnergy: boolean;
  sellHydrogen: boolean;
  sellHydrogenSilo: boolean;

  enableStoragesPlants: boolean;
  reenableSolarPlants: boolean;
  solarPlantsToReenable: string[];

  buyCo2Quotas: boolean;
  buyOil: boolean;
  buyUranium: boolean;

  storeHydrogen: boolean;
}

export interface StorageInfo {
  id: string;
  type: 'p2x' | 'chemical' | 'gravity';
  currentCharge: number;
  capacity: number;
  plantsConnected: number;
  chargePerSec: number;
  expectedChargePerSec: number;
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
  emissionPerKwh: number;
  co2Value: number;
  oilBuyPrice: number;
  uraniumPrice: number;
  userMoney: number;

  hydrogen: {
    hydrogenPrice: number;
    hydrogenSiloHolding: number;
    hydrogenSiloCapacity: number;
  };
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

export interface ReEnablePlantsResult {
  enabledPlants: number;
  kwEnergyBefore: number;
  kwEnergyAfter: number;
}

export interface RefuelEnableStoragesPlantsResult {
  totalEnabled: number;
  totalSkipped: number;
  totalOutOfFuel: number;
  didRefuel: boolean;
}
