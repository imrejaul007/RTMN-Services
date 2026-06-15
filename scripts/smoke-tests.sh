#!/bin/bash
# ===================================================================
# RTMN Smoke Tests
# ===================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

echo "Running smoke tests..."
echo ""

# ---- Test 1: SutAR Gateway Health ----
echo -n "Test 1: SutAR Gateway health... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4140/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL (got $RESPONSE)${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 2: RABTUL Auth ----
echo -n "Test 2: RABTUL Auth health... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4002/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL (got $RESPONSE)${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 3: HOJAI Business Copilot ----
echo -n "Test 3: HOJAI Business Copilot... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4600/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL (got $RESPONSE)${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 4: Event Bus ----
echo -n "Test 4: Event Bus health... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4510/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL (got $RESPONSE)${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 5: Manufacturing OS ----
echo -n "Test 5: Manufacturing OS... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4330/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL (got $RESPONSE)${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 6: Event Publish/Subscribe ----
echo -n "Test 6: Event Bus publish... "
RESPONSE=$(curl -s -X POST http://localhost:4510/api/events \
  -H "Content-Type: application/json" \
  -d '{"topic":"test.smoke","data":{"test":true}}' 2>/dev/null)
if [ -n "$RESPONSE" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 7: Service Registry ----
echo -n "Test 7: Service Registry... "
RESPONSE=$(curl -s http://localhost:4399/api/services 2>/dev/null)
if [ -n "$RESPONSE" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 8: MongoDB ----
echo -n "Test 8: MongoDB connection... "
RESPONSE=$(docker exec rtmn-mongo mongosh --eval "db.runCommand('ping').ok" --quiet 2>/dev/null)
if [ "$RESPONSE" = "1" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 9: Redis ----
echo -n "Test 9: Redis connection... "
RESPONSE=$(docker exec rtmn-redis redis-cli ping 2>/dev/null)
if [ "$RESPONSE" = "PONG" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Test 10: Prometheus ----
echo -n "Test 10: Prometheus up... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:9090/-/healthy 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL (got $RESPONSE)${NC}"
  FAIL=$((FAIL+1))
fi

# ---- Summary ----
echo ""
echo "─────────────────────────────────────────────────────────────"
echo "Smoke Tests Summary:"
echo -e "  ${GREEN}Passed: ${PASS}${NC}"
echo -e "  ${RED}Failed: ${FAIL}${NC}"
echo "─────────────────────────────────────────────────────────────"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0
