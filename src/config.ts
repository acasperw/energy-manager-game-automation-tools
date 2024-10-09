import dotenv from 'dotenv';

dotenv.config();

// Credentials
export const BASE_URL = 'https://energymanagergame.com';
export const LOGIN_EMAIL = process.env.LOGIN_EMAIL!;
export const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD!;

// Directories
export const DATA_DIR = 'energy_data';
export const SCREENSHOTS_DIR = 'screenshots';

// Thresholds
export const STORAGE_CHARGE_THRESHOLD_MIN = 80; // Threshold for storage charge to sell at
export const HYDROGEN_PRICE_THRESHOLD_MIN = 91; // Minimum price to sell hydrogen at

export const pctOfMaxPrice_other_grid_THRESHOLD_MIN = 80; // Percentage of max price an alternative grid must have to be eligible to be sold to

export const CO2_PRICE_THRESHOLD_MAX = 16; // Maximum price to buy CO2 Quotas at
export const OIL_PRICE_THRESHOLD_MAX = 1.8; // Maximum price to buy oil at
export const URANIUM_PRICE_THRESHOLD_MAX = 5000; // Maximum price to buy uranium at

// Research
export const RESEARCH_BUDGET_PERCENTAGE = 0.15; // Percentage of total budget to allocate to research (0.1 = 10%)
export const RESEARCH_SLOTS_TO_KEEP_OPEN = 1; // Keep at least this many research slots open

// Other
export const ENHANCED_REPORTING = false;
