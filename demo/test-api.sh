#!/bin/bash
# RTMN Customer Operations - Quick Test API
# Test all endpoints quickly

set -e

BASE_URL=${1:-"http://localhost:4000"}

echo "=========================================="
echo "RTMN Customer Operations - Quick Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4

  echo -n "Testing $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null)
  fi

  http_code=$(echo "$response" | tail -1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    return 1
  fi
}

# Counter
PASSED=0
FAILED=0

echo -e "${YELLOW}=== Health Checks ===${NC}"
test_endpoint "API Health" GET "/health" && ((PASSED++)) || ((FAILED++))
test_endpoint "Customer Twin" GET "/api/customers/health" && ((PASSED++)) || ((FAILED++))
test_endpoint "AI Intelligence" GET "/api/ai/health" && ((PASSED++)) || ((FAILED++))

echo ""
echo -e "${YELLOW}=== Customer Operations ===${NC}"

# Test Customer
echo -n "Creating customer... "
customer_response=$(curl -s -X POST "$BASE_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+919876543210"}')
customer_id=$(echo "$customer_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$customer_id" ]; then
  echo -e "${GREEN}✓ PASS${NC} (ID: $customer_id)"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAILED++))
  customer_id="test_cust_001"
fi

# Test Ticket
echo -n "Creating ticket... "
ticket_response=$(curl -s -X POST "$BASE_URL/api/tickets" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$customer_id\",\"subject\":\"Test Ticket\",\"message\":\"Test message\"}")
ticket_id=$(echo "$ticket_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ticket_id" ]; then
  echo -e "${GREEN}✓ PASS${NC} (ID: $ticket_id)"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAILED++))
fi

# Test AI
test_endpoint "AI Intent" GET "/api/ai/intent?text=refund" && ((PASSED++)) || ((FAILED++))
test_endpoint "AI Sentiment" GET "/api/ai/sentiment?text=great service" && ((PASSED++)) || ((FAILED++))

echo ""
echo -e "${YELLOW}=== Trust & Decisions ===${NC}"
test_endpoint "Trust Check" GET "/api/trust/check?customerId=$customer_id" && ((PASSED++)) || ((FAILED++))
test_endpoint "Auto Approve" POST "/api/approve" '{"customerId":"'"$customer_id"'","amount":500}' && ((PASSED++)) || ((FAILED++))

echo ""
echo -e "${YELLOW}=== Lead Operations ===${NC}"
test_endpoint "Create Lead" POST "/api/leads" '{"name":"Test Lead","email":"lead@example.com"}' && ((PASSED++)) || ((FAILED++))
test_endpoint "List Leads" GET "/api/leads" && ((PASSED++)) || ((FAILED++))

echo ""
echo "=========================================="
echo "RESULTS"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Check services.${NC}"
  exit 1
fi
