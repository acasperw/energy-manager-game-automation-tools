import { Plant } from "./api";

export type TabName =
  | 'plants'
  | 'storage'
  | 'pending'
  | 'vessel-port'
  | 'vessel-active';

export enum SidebarType {
  Production = 'production',
  Vessel = 'vessel',
}

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

  doResearch: boolean;
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

export interface ResearchInfo {
  id: number;
  price: number;
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

  research: {
    availableResearchStations: number;
    researchData: ResearchInfo[];
  };

  vessels: VesselInfo[];
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
  pctRefueled: number;
  totalDisabled: number;
}

// Vessels
export enum VesselStatus {
  Anchored = 'Anchored',
  AnchoredWithOil = 'AnchoredWithOil',
  Enroute = 'Enroute',
  Scanning = 'Scanning',
  Drilling = 'Drilling',
  InPort = 'InPort'
}

export interface VesselInfo {
  id: string;
  locLat: number;
  locLon: number;
  status: VesselStatus;
  oilOnboard: number;
}
