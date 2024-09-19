const fs = require('fs').promises;
const path = require('path');

async function removeGrid(gridNameToRemove) {
  const dataDir = './energy_data';

  try {
    const files = await fs.readdir(dataDir);
    console.log(`Found ${files.length} files in ${dataDir}`);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        console.log(`Processing file: ${filePath}`);

        try {
          const fileContent = await fs.readFile(filePath, 'utf8');

          let data = JSON.parse(fileContent);

          let modified = false;
          let removedCount = 0;

          for (let entry of data) {
            const originalLength = entry.grids.length;
            entry.grids = entry.grids.filter(grid =>
              grid.gridName.toLowerCase() !== gridNameToRemove.toLowerCase()
            );
            const newLength = entry.grids.length;

            if (newLength < originalLength) {
              modified = true;
              removedCount += (originalLength - newLength);
            }
          }

          if (modified) {
            const newContent = JSON.stringify(data, null, 2);
            await fs.writeFile(filePath, newContent);
            console.log(`Removed ${removedCount} instances of grid ${gridNameToRemove} from ${file}`);
          }
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
}

const gridNameToRemove = process.argv[2];

if (!gridNameToRemove) {
  console.error('Please provide a grid name to remove. Usage: node remove-grid.js <gridName>');
  process.exit(1);
}

removeGrid(gridNameToRemove)
  .then(() => console.log('Grid removal process completed.'))
  .catch(error => console.error('An error occurred:', error));
