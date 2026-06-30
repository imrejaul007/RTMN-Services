#!/bin/bash
# Test InternetOS API Server
# Verifies all endpoints work and actors are loaded

set -e

PORT="${PORT:-4595}"
BASE_URL="http://localhost:${PORT}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            HOJAI InternetOS API Test Suite                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Function to check response
check() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="$4"

  echo -n "[$name] $method $url ... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
  fi

  if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($response)"
  else
    echo -e "${RED}✗ FAIL${NC} ($response)"
  fi
}

# Test 1: Health
echo -e "\n${YELLOW}=== Health Checks ===${NC}"
check "Health" "$BASE_URL/health"
check "Ready" "$BASE_URL/ready"
echo ""

# Test 2: Service stats
echo -e "\n${YELLOW}=== Service Info ===${NC}"
check "Stats" "$BASE_URL/api/stats"

# Get actor count
actor_count=$(curl -s "$BASE_URL/api/actors" | python3 -c "import sys, json; print(json.load(sys.stdin).get('count', 0))")
echo -e "Total actors loaded: ${GREEN}$actor_count${NC}"

# Test 3: Actors
echo -e "\n${YELLOW}=== Actors ===${NC}"
check "List all actors" "$BASE_URL/api/actors"
check "Get google_maps actor" "$BASE_URL/api/actors/google_maps"
check "Get shopify actor" "$BASE_URL/api/actors/shopify"
check "Search 'shop'" "$BASE_URL/api/actors/search/shop"

# Test 4: Watchers
echo -e "\n${YELLOW}=== Watchers ===${NC}"
check "List watchers" "$BASE_URL/api/watchers"

# Test 5: History
echo -e "\n${YELLOW}=== History ===${NC}"
check "Get history stats" "$BASE_URL/api/history/stats"

# Test 6: Run an actor (this will fail because no params, but should return error properly)
echo -e "\n${YELLOW}=== Actor Execution ===${NC}"
check "Run google_maps search" "$BASE_URL/api/actors/google_maps/run" "POST" '{"action":"search","params":{"keyword":"salons","city":"Dubai"}}'
check "Run shopify products" "$BASE_URL/api/actors/shopify/run" "POST" '{"action":"search_products","params":{"storeUrl":"https://example.myshopify.com","query":"shoes"}}'

# Test 7: Research Agents
echo -e "\n${YELLOW}=== Research Agents ===${NC}"
check "List research agents" "$BASE_URL/api/research/agents"
check "Get market agent" "$BASE_URL/api/research/agents/market"
check "Get competitor agent" "$BASE_URL/api/research/agents/competitor"
check "Get procurement agent" "$BASE_URL/api/research/agents/procurement"
check "Get research stats" "$BASE_URL/api/research/stats"
check "Get research reports" "$BASE_URL/api/research/reports"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Test Suite Complete                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
