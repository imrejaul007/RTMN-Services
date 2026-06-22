#!/bin/bash
# BrandPulse Health Check Script

set -e

API_URL=${API_URL:-http://localhost:4770}
BRAND_ID=${BRAND_ID:-demo-brand}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "BrandPulse Health Check"
echo "=========================================="
echo "API URL: $API_URL"
echo ""

# Track status
TOTAL=0
PASSED=0
FAILED=0

check() {
    local name="$1"
    local command="$2"
    local expected="$3"

    TOTAL=$((TOTAL + 1))
    echo -n "[$TOTAL] $name... "

    result=$(eval "$command" 2>/dev/null | head -c 200)

    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        FAILED=$((FAILED + 1))
    fi
}

# API Health
check "API Health" "curl -s $API_URL/health" '"status":"healthy"'

# Service Info
check "Service Info" "curl -s $API_URL/" '"service":"HOJAI BrandPulse"'

# Generate Demo Data
echo ""
echo "--- Generating Demo Data ---"
curl -s -X POST "$API_URL/api/v1/demo/generate" \
    -H "Content-Type: application/json" \
    -d "{\"brandId\":\"$BRAND_ID\",\"brandName\":\"Test Hotel\",\"industry\":\"hotel\",\"tenantId\":\"test\"}" > /dev/null

# Brand Overview
check "Brand Overview" "curl -s $API_URL/api/v1/analytics/brand/$BRAND_ID/overview" '"success":true'

# Sentiment Trend
check "Sentiment Trend" "curl -s \"$API_URL/api/v1/analytics/brand/$BRAND_ID/sentiment?period=day\"" '"success":true'

# Rating Distribution
check "Rating Distribution" "curl -s $API_URL/api/v1/analytics/brand/$BRAND_ID/ratings" '"success":true'

# Reviews List
check "Reviews List" "curl -s $API_URL/api/v1/reviews/brand/$BRAND_ID?limit=5" '"success":true'

# Sentiment Analysis
check "Sentiment Analysis" "curl -s -X POST $API_URL/api/v1/sentiment/analyze -H 'Content-Type: application/json' -d '{\"text\":\"Great hotel!\"}'" '"success":true'

# Create Review
check "Create Review" "curl -s -X POST $API_URL/api/v1/reviews -H 'Content-Type: application/json' -d '{\"brandId\":\"$BRAND_ID\",\"tenantId\":\"test\",\"source\":\"direct\",\"content\":\"Test review\",\"rating\":5,\"author\":{\"name\":\"Test\"}}'" '"success":true'

# Alerts
check "Get Alerts" "curl -s $API_URL/api/v1/analytics/brand/$BRAND_ID/alerts" '"success":true'

# RTNM Status (via Hotel OS)
check "RTNM Status" "curl -s http://localhost:3899/rtnm/status 2>/dev/null" '"services"' || echo -e "${YELLOW}⚠ Hotel OS not running${NC}"

# Summary
echo ""
echo "=========================================="
echo "Health Check Summary"
echo "=========================================="
echo "Total: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed${NC}"
    exit 1
fi