// Top level API
export interface UserData {
  userData: {
    co2neutral: 0 | 1;
    emissionPerKwh: number;
    account: string; // Available money

  };
  plants: {
    [key: string]: Plant;
  };
  storage: {
    [key: string]: UserStorage;
  };
  grid: {
    [key: string]: ApiGrid;
  };
  vessel: Vessel;
}

export interface ProductionData {
  [key: string]: Storage;
}

// Types for the API
export interface Plant {
  plantId: string;
  lat: number;
  lon: number;
  online: 0 | 1;
  plantType: 'wind' | 'solar' | 'fossil';
  storageId: number;
  output: number;
  capacity: number;

  // Factors
  windspeed: number;
  cloudcover: number;
  wear: number;

  // Fossil plant
  fossilStop: number;
  fuelCapacity: number;
  fuelHolding: number;
}

export interface Storage {
  id: number;
  chargePerSec: number;
  capacity: number;
  currentCharge: number;
  value: number;
  type: 'gravity' | 'chemical' | 'p2x';
  landId: number;
  pctOfMaxPrice: number;
  isLocked: number;
}

export interface UserStorage {
  lat: number;
  lon: number;
  type: 'p2x' | 'chemical' | 'gravity';
  completed: Date;
  dischargeEnd: Date;
  discharging: 0 | 1;
  dischargeTime: Date;
  inputLoss: number;
  full: 0 | 1;
  chargeCompleted: Date;
  capacity: number;
  currentCharge: number;
}

export interface ApiGrid {
  gridName: string;
}


// Vessel Route Point
export interface VesselRoutePoint {
  lat: string | number;
  lon: string | number;
  distance: number;
}

// Enroute Vessel Information
export interface EnrouteVesselInfo {
  departed: string; // UNIX timestamp as string
  arrived: string;  // UNIX timestamp as string
  nowTime: number;  // Current UNIX timestamp
  route: VesselRoutePoint[];
  distance: string; // Total distance as string
}

// Detailed Vessel Data Information
export interface VesselDataInfo {
  id: string;
  userid: string;
  vesselName: string;
  drillId: string;
  purTime: string;      // Purchase time as UNIX timestamp string
  homePort: string;
  purValue: string;     // Purchase value as string
  locLat: string;       // Location latitude as string
  locLon: string;       // Location longitude as string
  departed: string;     // UNIX timestamp as string
  arrived: string;      // UNIX timestamp as string
  fieldLoc: string;
  refined: string;
  reverse: string;
  routeId: string;
  scanStart: string;
  scanEnd: string;
  oilFound: string;
  oilFoundAt: string;
  drillStart: string;
  drillEnd: string;
  oilOnboard: string;
  opLat: string | null; // Operational latitude, nullable
  opLon: string | null; // Operational longitude, nullable
  radius: string | null;
  extracted: string;
}

export interface VesselOperationInfo {
  scanEnd: string;      // UNIX timestamp as string
  drillEnd: string;     // UNIX timestamp as string
  nowTime: number;      // Current UNIX timestamp
  posLat: string;       // Position Latitude as string
  posLon: string;       // Position Longitude as string
  opLat: string;        // Operational Latitude as string
  opLon: string;        // Operational Longitude as string
  radius: string;       // Radius as string
}

// Vessel Interface
export interface Vessel {
  data: Record<string, VesselDataInfo>;
  operation?: Record<string, VesselOperationInfo>;
  enroute?: Record<string, EnrouteVesselInfo>;
}
