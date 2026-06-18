#!/bin/bash
# LEADOS Ecosystem Startup
set -e

echo "Starting LEADOS..."

# Kill existing
for port in 4001 4595 4751 4752 4786 4888 4894 4954 5170 5175; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 2

BASE="INTERNAL_SERVICE_TOKEN=salesmind123 ALLOWED_ORIGINS=http://localhost:3000"

# HOJAI Services
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
(cd hojai-web-intelligence && $BASE node dist/index.js &>/dev/null &)
(cd hojai-merchant-intelligence && $BASE node dist/index.js &>/dev/null &)
(cd hojai-lead-service && $BASE node dist/index.js &>/dev/null &)
(cd hojai-knowledge-graph && $BASE node dist/index.js &>/dev/null &)
(cd hojai-twinos && $BASE node dist/index.js &>/dev/null &)
(cd genie-voice && $BASE node dist/index.js &>/dev/null &)

# Lead Services
cd /Users/rejaulkarim/Documents/RTMN/services
($BASE PORT=4888 crm-engine/node dist/index.js &>/dev/null &)
($BASE PORT=4894 lead-twin/node src/index.js &>/dev/null &)
($BASE PORT=4954 journey-intelligence/node src/index.js &>/dev/null &)

# LeadOS Gateway
cd /Users/rejaulkarim/Documents/RTMN/services/lead-os-gateway
(PORT=5175 node src/index.js &>/dev/null &)

# REZ SalesMind
cd /Users/rejaulkarim/Documents/RTMN/companies/AdBazaar/REZ-SalesMind
$BASE HOJAI_WEB_INTEL=http://localhost:4595 HOJAI_MERCHANT_INTEL=http://localhost:4751 HOJAI_LEAD_SERVICE=http://localhost:4752 HOJAI_KG=http://localhost:4786 REZ_CRM_HUB=http://localhost:4056 PORT=5170 node dist/index.js &>/dev/null &

sleep 3

echo ""
echo "Services:"
for port in 4595 4752 4786 4888 4894 4954 5170 5175; do
  if lsof -ti:$port &>/dev/null; then echo "  $port OK"; else echo "  $port FAIL"; fi
done
echo ""
echo "Gateway: http://localhost:5175"
echo "SalesMind: http://localhost:5170"
