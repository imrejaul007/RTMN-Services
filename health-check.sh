#!/bin/bash
# RTMN Ecosystem Health Check Script
# Monitors all services and reports status

echo "=========================================="
echo "RTMN Ecosystem Health Check"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

total=0
healthy=0
unhealthy=0

check_service() {
  local port=$1
  local name=$2
  total=$((total + 1))

  response=$(curl -s -m 2 "http://localhost:$port/health" 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$response" ]; then
    status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null)
    if [ "$status" = "healthy" ] || [ "$status" = "ok" ] || [ "$status" = "ready" ]; then
      echo -e "${GREEN}✓${NC} Port $port - $name - $status"
      healthy=$((healthy + 1))
    else
      echo -e "${YELLOW}⚠${NC} Port $port - $name - $status"
      unhealthy=$((unhealthy + 1))
    fi
  else
    echo -e "${RED}✗${NC} Port $port - $name - DOWN"
    unhealthy=$((unhealthy + 1))
  fi
}

echo "Foundation Services:"
check_service 4399 "Integration Connector"
check_service 4510 "Event Bus"
check_service 4000 "GraphQL Federation"
check_service 4242 "Goal OS"
check_service 4703 "Memory OS"

echo ""
echo "Industry OS Services:"
check_service 5010 "Restaurant OS"
check_service 5020 "Healthcare OS"
check_service 5025 "Hotel OS"
check_service 5030 "Retail OS"
check_service 5035 "Legal OS"
check_service 5050 "Hospitality OS"
check_service 5060 "Education OS"
check_service 5080 "Automotive OS"
check_service 5090 "Beauty OS"
check_service 5100 "Energy OS"
check_service 5110 "Fitness OS"
check_service 5150 "Manufacturing OS"
check_service 5230 "RealEstate OS"
check_service 5600 "Media OS"

echo ""
echo "=========================================="
echo "Summary: $healthy/$total healthy"
echo "=========================================="

# Check registry
echo ""
echo "Service Registry:"
registry_count=$(curl -s http://localhost:4399/api/services 2>/dev/null | jq '.services | length' 2>/dev/null || echo "0")
echo "Registered services: $registry_count"

if [ $unhealthy -eq 0 ]; then
  echo -e "${GREEN}All services healthy!${NC}"
  exit 0
else
  echo -e "${RED}$unhealthy service(s) need attention${NC}"
  exit 1
fi