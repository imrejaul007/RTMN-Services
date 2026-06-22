#!/bin/bash
# BrandPulse Quick Test Script

set -e

API_URL="${API_URL:-http://localhost:4770}"
BRAND_ID="${BRAND_ID:-demo-brand}"

echo "=================================="
echo "BrandPulse API Quick Test"
echo "=================================="
echo "API URL: $API_URL"
echo "Brand ID: $BRAND_ID"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local expected="$2"
    local command="$3"

    echo -n "Testing: $name... "
    if eval "$command" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
}

echo "=================================="
echo "1. Health Check"
echo "=================================="
curl -s "$API_URL/health" | head -c 100
echo ""
echo ""

echo "=================================="
echo "2. Generate Demo Data"
echo "=================================="
echo "Creating demo brand..."
curl -s -X POST "$API_URL/api/v1/demo/generate" \
    -H "Content-Type: application/json" \
    -d '{"brandId":"'$BRAND_ID'","brandName":"Test Hotel","industry":"hotel","tenantId":"test-tenant"}' | head -c 150
echo ""
echo ""

echo "=================================="
echo "3. Brand Overview"
echo "=================================="
curl -s "$API_URL/api/v1/analytics/brand/$BRAND_ID/overview" | head -c 200
echo ""
echo ""

echo "=================================="
echo "4. Sentiment Analysis"
echo "=================================="
echo "Analyzing: 'This hotel was absolutely amazing! Great service and wonderful staff.'"
curl -s -X POST "$API_URL/api/v1/sentiment/analyze" \
    -H "Content-Type: application/json" \
    -d '{"text":"This hotel was absolutely amazing! Great service and wonderful staff."}'
echo ""
echo ""

echo "=================================="
echo "5. Rating Distribution"
echo "=================================="
curl -s "$API_URL/api/v1/analytics/brand/$BRAND_ID/ratings"
echo ""
echo ""

echo "=================================="
echo "6. Aspect Analysis"
echo "=================================="
curl -s "$API_URL/api/v1/analytics/brand/$BRAND_ID/aspects"
echo ""
echo ""

echo "=================================="
echo "7. Reviews List"
echo "=================================="
curl -s "$API_URL/api/v1/reviews/brand/$BRAND_ID?limit=3" | head -c 200
echo ""
echo ""

echo "=================================="
echo "8. Create Review"
echo "=================================="
curl -s -X POST "$API_URL/api/v1/reviews" \
    -H "Content-Type: application/json" \
    -d '{
        "brandId":"'$BRAND_ID'",
        "tenantId":"test-tenant",
        "source":"direct",
        "content":"Test review from quick test script",
        "rating":5,
        "author":{"name":"Test User","isVerified":true}
    }' | head -c 100
echo ""
echo ""

echo "=================================="
echo "9. RTNM Status (Hotel OS)"
echo "=================================="
curl -s "http://localhost:3899/rtnm/status" 2>/dev/null | head -c 150 || echo "Hotel OS not running"
echo ""
echo ""

echo "=================================="
echo "All Tests Complete!"
echo "=================================="
echo ""
echo "Dashboard: http://localhost:4780/?brandId=$BRAND_ID"
echo "Swagger:   http://localhost:4770/api/docs/ui"
echo ""
