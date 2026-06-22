#!/bin/bash
# BrandPulse Quick Start Script

set -e

echo "=========================================="
echo "BrandPulse Quick Start"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if MongoDB is running
echo -n "Checking MongoDB... "
if curl -s http://localhost:27017 > /dev/null 2>&1 || mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not running (start with: mongod --dbpath /data/db)${NC}"
fi

# Start BrandPulse API
echo ""
echo "Starting BrandPulse API on port 4770..."
cd /Users/rejaulkarim/Documents/RTMN/products/brandpulse
npm run dev &
API_PID=$!

# Wait for API to start
sleep 3

# Generate demo data
echo ""
echo "Generating demo data..."
curl -s -X POST http://localhost:4770/api/v1/demo/generate \
    -H "Content-Type: application/json" \
    -d '{"brandId":"demo-brand","brandName":"Demo Hotel","industry":"hotel","tenantId":"demo-tenant"}' | head -c 100
echo ""

# Start Dashboard
echo ""
echo "Starting Dashboard on port 4780..."
cd /Users/rejaulkarim/Documents/RTMN/products/brandpulse-dashboard
npm run dev &
DASH_PID=$!

echo ""
echo "=========================================="
echo "BrandPulse Started!"
echo "=========================================="
echo ""
echo "API:       http://localhost:4770"
echo "Dashboard: http://localhost:4780/?brandId=demo-brand"
echo "Swagger:   http://localhost:4770/api/docs/ui"
echo ""
echo "PIDs: API=$API_PID, Dashboard=$DASH_PID"
echo ""
echo "To stop: kill $API_PID $DASH_PID"
echo ""

# Open browser
open http://localhost:4780/?brandId=demo-brand 2>/dev/null || true
