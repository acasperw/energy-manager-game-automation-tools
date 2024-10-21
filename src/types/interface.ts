import { Plant } from "./api";

export type tabName = 'plants' | 'storage';

export interface TaskDecisions {
  sellEnergy: boolean;
  sellHydrogen: boolean;
  sellHydrogenSilo: boolean;

  manageStoragesPlants: boolean;

  buyCo2Quotas: boolean;
  buyCommodities: boolean; // Buy any of oil, uranium, or coal

  storeHydrogen: boolean;

  doResearch: boolean;

  vesselRequireAttention: boolean;
}

export interface StorageInfo {
  id: string;
  type: 'p2x' | 'chemical' | 'gravity';
  currentCharge: number;
  capacity: number;
  plantsConnected: number;
  chargePerSec: number;
  expectedChargePerSec: number;
  discharging: boolean;
  lat: number;
  lon: number;
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
  oilBuyPricePerKg: number;
  uraniumPricePerKg: number;
  coalPricePerKg: number;
  userMoney: number;
  userIsUnderHack: boolean;

  hydrogen: {
    hydrogenPricePerKg: number;
    hydrogenSiloHolding: number;
    hydrogenSiloCapacity: number;
    p2xStorageIds: string[];
    currentHydrogenStorageCharge: number;
    sellValue: number;
    siloSellValue: number;
  };

  research: {
    availableResearchStations: number;
    researchData: ResearchInfo[];
  };

  vessels: VesselInfo[];

  rerunTime?: number;
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

/**
 * @deprecated since version 2.3
 */
export interface ReEnablePlantsResult {
  enabledPlants: number;
  kwEnergyBefore: number;
  kwEnergyAfter: number;
}

/**
 * @deprecated since version 2.3
 */
export interface RefuelEnableStoragesPlantsResult {
  totalEnabled: number;
  totalSkipped: number;
  totalOutOfFuel: number;
  didRefuel: boolean;
  pctRefueled: number;
  totalDisabled: number;
}

export interface StorageAndPlantManagementResult {
  totalEnabled: number;
  totalDisabled: number;
  totalSkipped: number;
  totalSwitched: number;
  totalErrors: number;

  refueled: {
    totalOutOfFuel: number;
    didRefuelOil: boolean;
    didRefuelNuclear: boolean;
    didRefuelCoal: boolean;
    pctRefueledOil: number;
    pctRefueledNuclear: number;
    pctRefueledCoal: number;
  };

  reEnabledSolarPlants: {
    enabledPlants: number;
  };

  kwEnergyBefore: number;
  kwEnergyAfter: number;
}

// Vessels
export enum VesselStatus {
  InPort = 'InPort',
  InPortWithOil = 'InPortWithOil',       // Represents vessels in port with oil onboard
  Enroute = 'Enroute',
  Scanning = 'Scanning',
  Drilling = 'Drilling',
  Anchored = 'Anchored',
  AnchoredWithOil = 'AnchoredWithOil'    // Represents vessels anchored with oil onboard
}

export interface VesselInfo {
  id: string;
  locLat: number;
  locLon: number;
  status: VesselStatus;
  extracted: number;
  oilOnboard: number;
  vesselName: string;
  routeId: string;
  reverse: boolean; // true = Is on the way back to port, false = Is on the way to the destination
  arrivalTime: number | null;
}

export interface VesselDestinationInfo {
  id: string;
  name: string;
  distance: number; // Distance to the destination in nautical miles
}

export interface ProcessedVesselStatus {
  ports: VesselDestinationInfo[];
  maxSpeed: number | null;
}

export interface VesselInteractionReport {
  vesselId: string;
  vesselName: string;
  previousStatus: VesselStatus;
  newStatus: VesselStatus;
  action: string; // Description of what was done
  oilOnboard?: number; // Optional field to track the amount of oil if applicable
  destination?: VesselDestinationInfo | null; // Optional destination details if relevant
  soldValue?: number | null;
}

export interface DrillHistoryEntry {
  lat: number;
  lon: number;
  radius: number; // in meters
}

export interface ScanPoint {
  lat: number;
  lon: number;
}
