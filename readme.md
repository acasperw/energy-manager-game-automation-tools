# Energy Manager Web Scraper

This project is a web scraper for managing energy data, analyzing it, and performing various tasks such as enabling storage plants and selling energy.

## Prerequisites

- Node.js
- Login information for https://energymanagergame.com

## Installation

Install the dependencies:
`npm install`

## Major Commands

### Collect Energy Data
Collects energy data from the energy manager and saves it.
`node collect-data.js`

### Analyze Data
Analyzes the collected energy data and generates charts.
`node analyze-data.js`

### Enable Disabled Storage Plants
Enables storage plants that are currently disabled.
`node enable-storage-plants.js`

### Sell Energy
Processes and sells energy based on the collected data.
`node sell-energy.js`

### Run Utility Tasks
Runs utility tasks such as selling energy and enabling storage plants at regular intervals.
`node run-tasks.js`

## License
This project is licensed under the ISC License. 