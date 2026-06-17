#!/bin/bash
# REZ SalesMind Ecosystem - Start All Services
# Run this script to start all 10 services

set -e

TOKEN="${INTERNAL_SERVICE_TOKEN:-salesmind123}"
ORIGINS="${ALLOWED_ORIGINS:-http://localhost:3000}"
BASE="http://localhost"

echo "🚀 Starting REZ SalesMind Ecosystem..."
echo ""

# Kill existing processes on these ports
echo "📦 Clearing ports..."
for port in 4056 4595 4751 4752 4786 4521 4702 4760 5170 5200; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1

# Common env vars
ENV="INTERNAL_SERVICE_TOKEN=$TOKEN ALLOWED_ORIGINS=$ORIGINS HOJAI_WEB_INTEL=http://localhost:4595 HOJAI_MERCHANT_INTEL=http://localhost:4751 HOJAI_LEAD_SERVICE=http://localhost:4752 HOJAI_KG=http://localhost:4786 HOJAI_TWIN_OS=http://localhost:4521 GENIE_VOICE=http://localhost:4760 REZ_IDENTITY_HUB=http://localhost:4702 REZ_CRM_HUB=http://localhost:4056 ASSETMIND=http://localhost:5200"

# Start HOJAI services
echo "🔧 Starting HOJAI AI services..."
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI

for svc in hojai-web-intelligence hojai-merchant-intelligence hojai-lead-service hojai-knowledge-graph hojai-twinos genie-voice; do
  echo "  Starting $svc..."
  (cd $svc && $ENV node dist/index.js > /dev/null 2>&1 &)
  sleep 0.5
done

# Start REZ services
echo "🔗 Starting REZ services..."
cd /Users/rejaulkarim/Documents/RTMN/companies/AdBazaar/REZ-crm-hub
echo "  Starting REZ CRM Hub..."
($ENV node dist/index.js > /dev/null 2>&1 &)
sleep 1

echo "  Starting CorpID..."
cd /Users/rejaulkarim/Documents/RTMN/industry-os/shared/corpid-service
($ENV node src/index.js > /dev/null 2>&1 &)
sleep 1

echo "  Starting AssetMind..."
cd /Users/rejaulkarim/Documents/RTMN/companies/AssetMind
($ENV node src/index.js > /dev/null 2>&1 &)
sleep 1

# Start SalesMind
echo "🎯 Starting SalesMind..."
cd /Users/rejaulkarim/Documents/RTMN/companies/RTNM-Digital/REZ-SalesMind
($ENV node dist/index.js > /dev/null 2>&1 &)
sleep 2

# Verify
echo ""
echo "✅ All Services Started"
echo ""
for port in 4056 4595 4751 4752 4786 4521 4702 4760 5170 5200; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "  Port $port: ✅"
  else
    echo "  Port $port: ❌"
  fi
done

echo ""
echo "🌐 SalesMind: $BASE:5170"
echo "📊 Health: $BASE:5170/health"
echo "🔍 Ecosystem: $BASE:5170/api/ecosystem/status"
echo ""
echo "Auth Token: $TOKEN"
