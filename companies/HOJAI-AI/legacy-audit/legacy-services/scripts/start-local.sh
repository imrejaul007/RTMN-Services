#!/bin/bash
# Hojai AI - Start All Services Locally
# Version: 1.0 | Date: May 29, 2026

set -e

echo "=============================================="
echo "HOJAI AI - START ALL SERVICES"
echo "=============================================="

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting Hojai AI services...${NC}"
echo ""

# Services to start
SERVICES=(
    "hojai-core/hojai-event:4510"
    "hojai-core/hojai-memory:4520"
    "hojai-core/hojai-intelligence:4530"
    "hojai-core/hojai-agents:4550"
    "hojai-core/hojai-workflow:4560"
    "hojai-core/hojai-communications:4570"
    "hojai-core/hojai-hyperlocal:4580"
    "hojai-core/hojai-data:4590"
    "hojai-core/hojai-governance:4501"
    "hojai-core/hojai-api-gateway:4500"
    "hojai-industry:4700"
    "rez-intelligence:4100"
)

for service in "${SERVICES[@]}"; do
    IFS=':' read -r path port <<< "$service"
    dir="$BASE_DIR/$path"
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}Starting${NC} $path on port $port..."
        # In production, would run: node $dir/dist/index.js
        # For now, just show the command
        echo "  Command: node $dir/dist/index.js"
    else
        echo -e "${YELLOW}Skipping${NC} $path (not found)"
    fi
done

echo ""
echo "=============================================="
echo "To run services:"
echo "1. Build TypeScript: npx tsc"
echo "2. Start services: node <service>/dist/index.js"
echo ""
echo "Or use Docker: docker-compose up"
echo "=============================================="
