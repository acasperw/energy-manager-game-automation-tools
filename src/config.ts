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
export const STORAGE_CHARGE_THRESHOLD_MIN = 80;
export const HYDROGEN_PRICE_THRESHOLD_MIN = 89;

export const pctOfMaxPrice_other_grid_THRESHOLD_MIN = 70;

export const CO2_PRICE_THRESHOLD_MAX = 21;
export const OIL_PRICE_THRESHOLD_MAX = 2.5;
export const URANIUM_PRICE_THRESHOLD_MAX = 5000;
