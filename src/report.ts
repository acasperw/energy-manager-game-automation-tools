import { displayAverageFactors } from './utils/data-storage';

async function main() {
  try {
    await displayAverageFactors('cloudCover');
    await displayAverageFactors('output');
    await displayAverageFactors('windspeed');
  } catch (error) {
    console.error('Error reading factors summary:', error);
  }
}

main();
