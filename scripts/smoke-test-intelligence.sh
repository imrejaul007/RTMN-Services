#!/bin/bash
# Smoke test for the two Intelligence services
# Tests: ai-intelligence (port 4881) and customer-intelligence (port 4885)
# Run: ./scripts/smoke-test-intelligence.sh

set -e

AI_PORT=4881
CI_PORT=4885
PASS=0
FAIL=0
WARN=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

ok() { echo -e "${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "${YELLOW}⚠${NC} $1"; WARN=$((WARN+1)); }

# Helper: HTTP request with timeout
http() {
  local method=$1 url=$2 body=$3
  if [ -n "$body" ]; then
    curl -sS --max-time 10 -X "$method" -H "Content-Type: application/json" -d "$body" "$url"
  else
    curl -sS --max-time 10 -X "$method" "$url"
  fi
}

echo "============================================================"
echo "  Intelligence Services Smoke Test"
echo "  ai-intelligence:  $AI_PORT"
echo "  customer-intelligence:  $CI_PORT"
echo "============================================================"
echo ""

# 1. Health checks
echo "--- 1. Health checks ---"

AI_HEALTH=$(http GET "http://localhost:$AI_PORT/api/health")
if echo "$AI_HEALTH" | grep -q '"status":"healthy"'; then
  ok "ai-intelligence /api/health returns healthy"
else
  fail "ai-intelligence /api/health: $AI_HEALTH"
fi

CI_HEALTH=$(http GET "http://localhost:$CI_PORT/health")
if echo "$CI_HEALTH" | grep -q '"status":"healthy"'; then
  ok "customer-intelligence /health returns healthy"
else
  fail "customer-intelligence /health: $CI_HEALTH"
fi

echo ""

# 2. AI Intelligence - analyze endpoint
echo "--- 2. HOJAI Intelligence - /api/analyze ---"

ANALYZE_RESPONSE=$(http POST "http://localhost:$AI_PORT/api/analyze" '{
  "text": "I am extremely frustrated with your service. The app keeps crashing and I want a refund immediately!",
  "context": { "channel": "email", "customerId": "cust_013" }
}')

if echo "$ANALYZE_RESPONSE" | grep -q '"primaryIntent"'; then
  ok "analyze returns primaryIntent"
else
  fail "analyze: $ANALYZE_RESPONSE"
fi

if echo "$ANALYZE_RESPONSE" | grep -q '"sentiment"'; then
  ok "analyze returns sentiment"
else
  fail "analyze missing sentiment"
fi

if echo "$ANALYZE_RESPONSE" | grep -q '"prediction"'; then
  ok "analyze returns prediction"
else
  fail "analyze missing prediction"
fi

if echo "$ANALYZE_RESPONSE" | grep -q '"recommendations"'; then
  ok "analyze returns recommendations"
else
  fail "analyze missing recommendations"
fi

if echo "$ANALYZE_RESPONSE" | grep -q '"retrieval"'; then
  ok "analyze returns retrieval (knowledge base)"
else
  fail "analyze missing retrieval"
fi

echo ""

# 3. AI Intelligence - positive text
echo "--- 3. HOJAI Intelligence - positive sentiment ---"

POSITIVE_RESPONSE=$(http POST "http://localhost:$AI_PORT/api/analyze" '{
  "text": "Thank you so much! Your service is amazing and the team was very helpful.",
  "context": { "channel": "chat" }
}')

if echo "$POSITIVE_RESPONSE" | grep -q '"sentiment"'; then
  ok "positive analyze returns sentiment"
else
  fail "positive analyze failed: $POSITIVE_RESPONSE"
fi

echo ""

# 4. AI Intelligence - policy evaluation
echo "--- 4. HOJAI Intelligence - /api/policy/evaluate ---"

POLICY_RESPONSE=$(http POST "http://localhost:$AI_PORT/api/policy/evaluate" '{
  "orgId": "org_rez",
  "context": {
    "situation": "customer requesting refund",
    "requestType": "refund",
    "amount": 500,
    "daysSincePurchase": 5,
    "customerTier": "gold"
  }
}')

if echo "$POLICY_RESPONSE" | grep -qE '"applicablePolicies"|"recommendedActions"|"requiresApproval"'; then
  ok "policy/evaluate returns policies or actions"
else
  warn "policy/evaluate returned: $(echo "$POLICY_RESPONSE" | head -c 200)"
fi

echo ""

# 5. Customer Intelligence - customers list
echo "--- 5. HOJAI Customer Intelligence - /api/customers ---"

CUSTOMERS_RESPONSE=$(http GET "http://localhost:$CI_PORT/api/customers?page=1&limit=5")

if echo "$CUSTOMERS_RESPONSE" | grep -q '"success":true'; then
  ok "customers list returns success"
else
  fail "customers list: $CUSTOMERS_RESPONSE"
fi

CUSTOMER_COUNT=$(echo "$CUSTOMERS_RESPONSE" | grep -oE '"total":[0-9]+' | head -1 | grep -oE '[0-9]+')
if [ -n "$CUSTOMER_COUNT" ] && [ "$CUSTOMER_COUNT" -gt 0 ]; then
  ok "customers list returns $CUSTOMER_COUNT customers"
else
  warn "no customers found - did you run the seed script?"
fi

echo ""

# 6. Customer Intelligence - get single customer
echo "--- 6. HOJAI Customer Intelligence - GET /api/customers/:id ---"

CUST_RESPONSE=$(http GET "http://localhost:$CI_PORT/api/customers/cust_001")

if echo "$CUST_RESPONSE" | grep -q '"customerId":"cust_001"'; then
  ok "single customer lookup works"
else
  fail "single customer: $CUST_RESPONSE"
fi

echo ""

# 7. Customer Intelligence - risk events
echo "--- 7. HOJAI Customer Intelligence - /api/risk/events/:customerId ---"

RISK_RESPONSE=$(http GET "http://localhost:$CI_PORT/api/risk/events/cust_013")

if echo "$RISK_RESPONSE" | grep -q '"success":true'; then
  ok "risk events lookup works"
else
  fail "risk events: $RISK_RESPONSE"
fi

echo ""

# 8. Customer Intelligence - segments
echo "--- 8. HOJAI Customer Intelligence - /api/segments ---"

SEGMENTS_RESPONSE=$(http GET "http://localhost:$CI_PORT/api/segments")

if echo "$SEGMENTS_RESPONSE" | grep -q '"success":true'; then
  ok "segments endpoint works"
else
  fail "segments: $SEGMENTS_RESPONSE"
fi

echo ""

# 9. Customer Intelligence - identity resolution
echo "--- 9. HOJAI Customer Intelligence - /api/identity/resolve ---"

IDENTITY_RESPONSE=$(http POST "http://localhost:$CI_PORT/api/identity/resolve" '{
  "identities": { "email": "aarav.sharma@example.com" },
  "source": "smoke-test"
}')

if echo "$IDENTITY_RESPONSE" | grep -qE '"masterCustomer"|"wasResolved"'; then
  ok "identity resolve works"
else
  warn "identity resolve returned: $(echo "$IDENTITY_RESPONSE" | head -c 200)"
fi

# Try risk score calculation
RISK_SCORE_RESPONSE=$(http GET "http://localhost:$CI_PORT/api/risk/score/cust_013")

if echo "$RISK_SCORE_RESPONSE" | grep -qE '"overall"|"fraudRisk"|"level"'; then
  ok "risk score lookup works"
else
  warn "risk score returned: $(echo "$RISK_SCORE_RESPONSE" | head -c 200)"
fi

# Try risk calculation
RISK_CALC=$(http POST "http://localhost:$CI_PORT/api/risk/calculate" '{
  "customerId": "cust_013"
}')

if echo "$RISK_CALC" | grep -qE '"overall"|"fraudRisk"|"level"'; then
  ok "risk calculate works"
else
  warn "risk calculate returned: $(echo "$RISK_CALC" | head -c 200)"
fi

echo ""

# 10. Customer Intelligence - metrics
echo "--- 10. HOJAI Customer Intelligence - metrics endpoints ---"

# Try /api/metrics/summary
METRICS_RESPONSE=$(http GET "http://localhost:$CI_PORT/api/metrics/summary")

if echo "$METRICS_RESPONSE" | grep -qE '"success":true|"total"'; then
  ok "metrics/summary endpoint works"
else
  warn "metrics/summary: $(echo "$METRICS_RESPONSE" | head -c 100)"
fi

# Try /api/metrics/tier-distribution
METRICS_RESPONSE2=$(http GET "http://localhost:$CI_PORT/api/metrics/tier-distribution")

if echo "$METRICS_RESPONSE2" | grep -qE '"success":true|"distribution"'; then
  ok "metrics/tier-distribution endpoint works"
else
  warn "metrics/tier-distribution: $(echo "$METRICS_RESPONSE2" | head -c 100)"
fi

# Try /api/metrics/revenue-breakdown
METRICS_RESPONSE3=$(http GET "http://localhost:$CI_PORT/api/metrics/revenue-breakdown")

if echo "$METRICS_RESPONSE3" | grep -qE '"success":true|"breakdown"'; then
  ok "metrics/revenue-breakdown endpoint works"
else
  warn "metrics/revenue-breakdown: $(echo "$METRICS_RESPONSE3" | head -c 100)"
fi

echo ""
echo "============================================================"
echo "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} warnings${NC}"
echo "============================================================"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0
