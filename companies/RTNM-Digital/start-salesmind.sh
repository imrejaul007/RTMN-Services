#!/bin/bash
# REZ SalesMind v2.3.0 - Start All Services
set -e
export ALLOWED_ORIGINS="http://localhost:3000"
export INTERNAL_SERVICE_TOKEN="salesmind123"
BASE="ALLOWED_ORIGINS=$ALLOWED_ORIGINS INTERNAL_SERVICE_TOKEN=$INTERNAL_SERVICE_TOKEN"

echo "🚀 Starting REZ SalesMind Ecosystem v2.3.0..."
echo ""

# Kill existing
for port in 4056 4595 4751 4752 4786 4521 4702 4760 5170 5200; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1

# Start HOJAI services
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
for svc in hojai-web-intelligence hojai-merchant-intelligence hojai-lead-service hojai-knowledge-graph hojai-twinos genie-voice; do
  (cd $svc && $BASE node dist/index.js > /dev/null 2>&1 &)
done

# Start REZ services
cd /Users/rejaulkarim/Documents/RTMN/companies/AdBazaar/REZ-crm-hub
($BASE node dist/index.js > /dev/null 2>&1 &)

cd /Users/rejaulkarim/Documents/RTMN/industry-os/shared/corpid-service
($BASE node src/index.js > /dev/null 2>&1 &)

cd /Users/rejaulkarim/Documents/RTMN/companies/AssetMind
($BASE node src/index.js > /dev/null 2>&1 &)

# Start SalesMind
cd /Users/rejaulkarim/Documents/RTMN/companies/RTNM-Digital/REZ-SalesMind
$BASE HOJAI_WEB_INTEL=http://localhost:4595 HOJAI_MERCHANT_INTEL=http://localhost:4751 HOJAI_LEAD_SERVICE=http://localhost:4752 HOJAI_KG=http://localhost:4786 HOJAI_TWIN_OS=http://localhost:4521 GENIE_VOICE=http://localhost:4760 REZ_IDENTITY_HUB=http://localhost:4702 REZ_CRM_HUB=http://localhost:4056 ASSETMIND=http://localhost:5200 node dist/index.js > /dev/null 2>&1 &

sleep 4

echo "✅ Services Started"
for port in 4056 4595 4751 4752 4786 4521 4702 4760 5170 5200; do
  lsof -ti:$port > /dev/null 2>&1 && echo "  Port $port: ✅" || echo "  Port $port: ❌"
done

echo ""
echo "🌐 SalesMind: http://localhost:5170"
echo "📊 Health: http://localhost:5170/health"
echo "🔑 Token: salesmind123"
