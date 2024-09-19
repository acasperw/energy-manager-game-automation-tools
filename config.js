module.exports = {
  DATA_DIR: 'energy_data',
  CHARTS_DIR: 'charts',
  MIN_INTERVAL_MS: 30 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  LOGIN_URL: 'https://energymanagergame.com/weblogin/',
  LOGIN_EMAIL: process.env.LOGIN_EMAIL || 'youremail@domain.com',
  LOGIN_PASSWORD: process.env.LOGIN_PASSWORD || 'your_password',
  CHARGE_THRESHOLD: 99000,
  TOP_PRICES_COUNT: 5,

  // Multiplier for visual debugging
  ARTIFICIAL_SLOWDOWN: 1
};
