Available security
POST - HTML (can scrape)
/security.php

Buy a firewall - SteelVault X 2.0
POST - HTML 
/security.php?mode=buy&id=6


// Vessels

// Mini vessel information - Dynamic depending on state of vessel
// POST - HTML (can scrape)
/status-vessel.php?id=15634

// From field to back to port 
// POST - HTML (can scrape)
/api/sea.routes.php?id=1&reverse=1

// tell ship to depart to destination X at speed Y
POST - HTML (Action)
/vessel-depart.php?vesselId=15634&destination=1&speed=16

Port > Enroute > Oilfield - begin scan > Scanning >(found oil, full) > Drilling > enroute > Port 

// Sell / transfer oil

Transfer 
POST - HTML 
(amount in bbl - 1,000 bbl = 100,000 kg )
/commodities-sell.php?mode=do&type=transfer&amount=2472

Sell
/commodities-sell.php?mode=do&type=sell&amount=2049


// Hack

if display block`<div id="hackOverlay" style="display: block;">`
if `#hack-countdown` exists ?


// Enable / disable plant

// If on, will turn off
// If off, will turn on

// where 8338862 is the long plant id

/status-plant-set.php?id=8338862


// Re-enable entire storage (and attached plants)

// where 10521184 is the storage id (not available during hack)

/production-plants-state.php?mode=online&targetUnit=10521184


/// Energy Grids

// Get storage status (eg, upcoming mwh value)
// where 10521184 is the storage id
/status-storage.php?id=10927690

// Get sell page info 
// where 50940 is the land id for the grid (this is GB-13 for example)
// Including advanced options
/power-exchange-details.php?id=50940

// Sell to current grid
/power-exchange-sell.php?grid=51300&mode=details

// Cross sell grid
/power-exchange-sell.php?grid=51300&mode=details&gridTarget=50941

// Response from both

// reported income in tab $2864788
// income looks to be changeNumber('headerAccount',2,2864788);
"income": 2879329 is without alliance fee
"halfAlert": 1 was sold at half value due to low demand

// energy sale without half value due to demand
<script>
delete chargeRates[50237];
setTimeout(function() {
$('#exchange-sell-btn-50237').addClass('not-active-large').html('Sell');
$('#current-demand-50237').html('156.39 MW<span class=text-lowercase>h</span>');
$('#exchange-sell-50237').html('$ 0');
$('#advanced-tab').hide();
$('#details-main').removeClass('not-active');
},500);
</script>
<script>
var gridSales = [];
chargeRates = {};
$('#sell-to-grid-btn').addClass('not-active-large');
clearInterval(exchangeTimer);
addNewDataPointToChart(recentTradesChart,523096);
hideUnitDetails();
stopGridLine(9206670);stopPlant(9206670,'wind');plantOutput[9206670] = 0;setStorageMarkerState(11008418,'grid');gridDischarge[11008418] = 1316;delete productionChargeRates[11008418];startDischarging(11008418,1728861393,1728862709,1728861393);setChargeComplete(11008418,0);liveData[11008418].chargePerSec = 0;liveData[11008418].charged = 0;gridSales.push({"grid": "CZ-4", "sold": 523096, "income": 2879329, "halfAlert": 0});changeNumber('headerAccount',2,2864788);$('#charge-status-50237').html('0 kW<span class=text-lowercase>h</span>').data('value', 0);				showSalesResult(gridSales,false,14541,0);
setIntro(12);
</script>

// Energy sale at low demand
// reported income +$2700875
changeNumber('headerAccount',2,2700875)
2714584

<script>
delete chargeRates[50948];
setTimeout(function() {
$('#exchange-sell-btn-50948').addClass('not-active-large').html('Sell');
$('#current-demand-50948').html('0 kW<span class=text-lowercase>h</span>');
$('#exchange-sell-50948').html('$ 0');
$('#advanced-tab').hide();
$('#details-main').removeClass('not-active');
},500);
</script>

<script>
var gridSales = [];
chargeRates = {};
$('#sell-to-grid-btn').addClass('not-active-large');
clearInterval(exchangeTimer);
addNewDataPointToChart(recentTradesChart,927032);
hideUnitDetails();
stopGridLine(8338460);stopPlant(8338460,'solar');plantOutput[8338460] = 0;stopGridLine(8338862);stopPlant(8338862,'solar');plantOutput[8338862] = 0;stopGridLine(8343346);stopPlant(8343346,'solar');plantOutput[8343346] = 0;stopGridLine(8390836);stopPlant(8390836,'solar');plantOutput[8390836] = 0;stopGridLine(9475050);stopPlant(9475050,'fossil');plantOutput[9475050] = 0;stopGridLine(9846710);stopPlant(9846710,'fossil');plantOutput[9846710] = 0;setStorageMarkerState(10521075,'grid');gridDischarge[10521075] = 1114;delete productionChargeRates[10521075];startDischarging(10521075,1728861716,1728862830,1728861716);setChargeComplete(10521075,0);liveData[10521075].chargePerSec = 0;liveData[10521075].charged = 434807;gridSales.push({"grid": "DE-25", "sold": 927032, "income": 2714584, "halfAlert": 1});changeNumber('headerAccount',2,2700875);$('#charge-status-50948').html('0 kW<span class=text-lowercase>h</span>').data('value', 0);				showSalesResult(gridSales,false,13709,0);
setIntro(12);
</script>
