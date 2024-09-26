export interface FactorData {
  total: number;
  instances: number;
}

export interface FactorsSummary {
  [gridId: string]: Record<string, FactorData>;
}
