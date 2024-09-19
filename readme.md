# Energy Manager Game - Game Helper (v2)

This project is a web scraper for managing energy data and performing various tasks such as enabling storage plants and selling energy.

For various other tools, including analyzing historical data, https://github.com/acasperw/Energy_Manager_Web_Scraper/tree/energy-manager-v1 may interest you. 

## Prerequisites

- Node.js
- Login information for https://energymanagergame.com

## Installation

Install the dependencies:
`npm install`

Create a `.env` file for your login information

```
LOGIN_EMAIL=your_email@domain.com
LOGIN_PASSWORD=your_password
```

`npm run build`

then

`npm run start`

This will start an hourly scheduled task runner that automates 

- Energy Sales
- Co2 Quotas buying
- Hydrogen Sales
- Offline plant enabling

## License
This project is licensed under the ISC License, but please let me know if you use it, id love to know.