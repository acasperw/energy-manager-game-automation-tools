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