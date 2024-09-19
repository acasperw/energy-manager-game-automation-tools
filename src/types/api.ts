// Top level API
export interface UserData {
  userData: {
    co2neutral: 0 | 1;
    emissionPerKwh: number;

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
  plantType: 'wind' | 'solar';
  storageId: number;
  wear: number;
  output: number;
  capacity: number;

  windspeed: number;
  cloudcover: number;
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

