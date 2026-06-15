#!/bin/bash
# RTMN Ecosystem Startup Script
# Starts all foundation and industry OS services

set -e

echo "=========================================="
echo "RTMN Ecosystem - Starting Services"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Services configuration
declare -A SERVICES=(
  ["4399"]="REZ-ecosystem-connector:Integration Connector"
  ["4510"]="REZ-event-bus:Event Bus"
  ["4000"]="REZ-graphql-federation:GraphQL Federation"
  ["4242"]="goal-os:Goal OS"
  ["4703"]="memory-os:Memory OS"
  ["5010"]="restaurant-os:Restaurant OS"
  ["5020"]="healthcare-os:Healthcare OS"
  ["5025"]="hotel-os:Hotel OS"
  ["5030"]="retail-os:Retail OS"
  ["5035"]="legal-os:Legal OS"
  ["5050"]="hospitality-os:Hospitality OS"
  ["5060"]="education-os:Education OS"
  ["5080"]="automotive-os:Automotive OS"
  ["5090"]="beauty-os:Beauty OS"
  ["5100"]="energy-os:Energy OS"
  ["5110"]="fitness-os:Fitness OS"
  ["5150"]="manufacturing-os:Manufacturing OS"
  ["5230"]="realestate-os:RealEstate OS"
  ["5600"]="media-os:Media OS"
)

# Service directories
declare -A DIRS=(
  ["4399"]="/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-ecosystem-connector"
  ["4510"]="/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-event-bus"
  ["4000"]="/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-graphql-federation"
  ["4242"]="/Users/rejaulkarim/Documents/RTMN/goal-os"
  ["4703"]="/Users/rejaulkarim/Documents/RTMN/memory-os"
  ["5010"]="/Users/rejaulkarim/Documents/RTMN/restaurant-os"
  ["5020"]="/Users/rejaulkarim/Documents/RTMN/healthcare-os"
  ["5025"]="/Users/rejaulkarim/Documents/RTMN/hotel-os"
  ["5030"]="/Users/rejaulkarim/Documents/RTMN/retail-os"
  ["5035"]="/Users/rejaulkarim/Documents/RTMN/legal-os"
  ["5050"]="/Users/rejaulkarim/Documents/RTMN/hospitality-os"
  ["5060"]="/Users/rejaulkarim/Documents/RTMN/education-os"
  ["5080"]="/Users/rejaulkarim/Documents/RTMN/automotive-os"
  ["5090"]="/Users/rejaulkarim/Documents/RTMN/beauty-os"
  ["5100"]="/Users/rejaulkarim/Documents/RTMN/energy-os"
  ["5110"]="/Users/rejaulkarim/Documents/RTMN/fitness-os"
  ["5150"]="/Users/rejaulkarim/Documents/RTMN/manufacturing-os"
  ["5230"]="/Users/rejaulkarim/Documents/RTMN/realestate-os"
  ["5600"]="/Users/rejaulkarim/Documents/RTMN/media-os"
)

check_port() {
  local port=$1
  if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

start_service() {
  local port=$1
  local info=$2
  local dir=$3
  local name=$(echo $info | cut -d: -f1)
  local desc=$(echo $info | cut -d: -f2)

  if check_port $port; then
    echo -e "${GREEN}✓${NC} Port $port - $desc (already running)"
    return 0
  fi

  if [ ! -d "$dir" ]; then
    echo -e "${RED}✗${NC} Port $port - $desc (directory not found: $dir)"
    return 1
  fi

  echo -e "${YELLOW}→${NC} Starting Port $port - $desc..."
  cd "$dir"
  npm start > /tmp/$name.log 2>&1 &
  sleep 2

  if check_port $port; then
    echo -e "${GREEN}✓${NC} Port $port - $desc (started)"
  else
    echo -e "${RED}✗${NC} Port $port - $desc (failed - check /tmp/$name.log)"
  fi
}

echo "Checking services..."
echo ""

# Start all services
for port in "${!SERVICES[@]}"; do
  start_service $port "${SERVICES[$port]}" "${DIRS[$port]}"
done

echo ""
echo "=========================================="
echo "Health Check"
echo "=========================================="
echo ""

# Health check
for port in "${!SERVICES[@]}"; do
  if check_port $port; then
    echo -e "${GREEN}✓${NC} Port $port"
  else
    echo -e "${RED}✗${NC} Port $port"
  fi
done

echo ""
echo "=========================================="
echo "Registry Status"
echo "=========================================="
curl -s http://localhost:4399/api/services 2>/dev/null | jq '.services | length' 2>/dev/null | xargs -I{} echo "Registered services: {}"
echo ""
echo "Integration Connector: http://localhost:4399/api/services"
echo "GraphQL Federation: http://localhost:4000/graphql"
echo "Event Bus: http://localhost:4510/health"
echo ""
