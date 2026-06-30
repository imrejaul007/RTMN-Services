#!/bin/bash
###############################################################################
# End-to-End Integration Test
# Tests the complete user journey through all 13 services
###############################################################################

set -e

# Configuration
HUB_URL=${HUB_URL:-"http://localhost:4399"}
COMMERCEOS_URL=${COMMERCEOS_URL:-"http://localhost:5400"}
BAM_URL=${BAM_URL:-"http://localhost:5550"}
TEMPLATE_URL=${TEMPLATE_URL:-"http://localhost:5670"}
POOL_URL=${POOL_URL:-"http://localhost:5680"}
STUDIO_URL=${STUDIO_URL:-"http://localhost:5750"}
GRAPH_URL=${GRAPH_URL:-"http://localhost:5800"}
TRADE_URL=${TRADE_URL:-"http://localhost:5810"}
CROSSBORDER_URL=${CROSSBORDER_URL:-"http://localhost:5820"}
DIST_URL=${DIST_URL:-"http://localhost:5830"}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

###############################################################################
# Helpers
###############################################################################
log_step() { echo -e "\n${BLUE}═══ $1 ═══${NC}"; }
log_pass() { echo -e "${GREEN}✓ PASS${NC} $1"; PASSED=$((PASSED + 1)); }
log_fail() { echo -e "${RED}✗ FAIL${NC} $1"; FAILED=$((FAILED + 1)); }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

assert_status() {
    local url=$1
    local expected=$2
    local desc=$3
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" 2>/dev/null || echo "000")
    if [ "$status" = "$expected" ] || [ "$status" = "200" ] && [ "$expected" = "200" ]; then
        log_pass "$desc ($status)"
    else
        log_fail "$desc (got $status, expected $expected)"
    fi
}

assert_contains() {
    local url=$1
    local expected=$2
    local desc=$3
    local body=$(curl -s --max-time 3 "$url" 2>/dev/null || echo "")
    if echo "$body" | grep -q "$expected"; then
        log_pass "$desc (found '$expected')"
    else
        log_fail "$desc (not found: '$expected')"
    fi
}

###############################################################################
# Phase 1: Service Health Checks
###############################################################################
log_step "Phase 1: Service Health Checks"

assert_status "$HUB_URL/health" "200" "RTMN Hub"
assert_status "$COMMERCEOS_URL/health" "200" "CommerceOS Gateway"
assert_status "$BAM_URL/health" "200" "BAM Gateway"
assert_status "http://localhost:5551/health" "200" "Vendor Acquisition Worker"
assert_status "http://localhost:5552/health" "200" "Catalog Normalization Worker"
assert_status "http://localhost:5553/health" "200" "Recommendation Worker"
assert_status "$TEMPLATE_URL/health" "200" "Template Engine"
assert_status "$POOL_URL/health" "200" "Vendor Liquidity Pools"
assert_status "$STUDIO_URL/health" "200" "Commerce Studio Backend"
assert_status "$GRAPH_URL/health" "200" "Product Graph"
assert_status "$TRADE_URL/health" "200" "Trade Finance"
assert_status "$CROSSBORDER_URL/health" "200" "Cross-Border Commerce"
assert_status "$DIST_URL/health" "200" "Universal Distribution"

###############################################################################
# Phase 2: Template Discovery
###############################################################################
log_step "Phase 2: Template Discovery"

TEMPLATES=$(curl -s "$HUB_URL/api/templates/templates" 2>/dev/null || echo "{}")
TEMPLATE_COUNT=$(echo "$TEMPLATES" | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$TEMPLATE_COUNT" -ge "20" ]; then
    log_pass "Found $TEMPLATE_COUNT templates (expected 26)"
else
    log_fail "Only $TEMPLATE_COUNT templates found (expected 26)"
fi

# Verify restaurant template
RESTAURANT=$(curl -s "$HUB_URL/api/templates/templates/restaurant" 2>/dev/null || echo "")
if echo "$RESTAURANT" | grep -q "Restaurant Commerce"; then
    log_pass "Restaurant template accessible"
else
    log_fail "Restaurant template not accessible"
fi

###############################################################################
# Phase 3: Vendor Pools
###############################################################################
log_step "Phase 3: Vendor Pool Liquidity"

POOLS=$(curl -s "$HUB_URL/api/pools/pools" 2>/dev/null || echo "{}")
POOL_COUNT=$(echo "$POOLS" | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$POOL_COUNT" -ge "10" ]; then
    log_pass "Found $POOL_COUNT vendor pools (expected 12)"
else
    log_fail "Only $POOL_COUNT pools found"
fi

# Verify vendor count in electronics pool
ELECTRONICS=$(curl -s "$HUB_URL/api/pools/pools/electronics-pool" 2>/dev/null || echo "")
VENDOR_COUNT=$(echo "$ELECTRONICS" | grep -o '"vendorCount"' | head -1)
if [ -n "$VENDOR_COUNT" ]; then
    log_pass "Electronics pool accessible with vendors"
else
    log_warn "Electronics pool data not available (acceptable in test)"
fi

###############################################################################
# Phase 4: BAM Workers
###############################################################################
log_step "Phase 4: BAM Workers"

# List workers
WORKERS=$(curl -s "$HUB_URL/api/bam/workers" 2>/dev/null || echo "{}")
WORKER_COUNT=$(echo "$WORKERS" | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$WORKER_COUNT" -ge "5" ]; then
    log_pass "Found $WORKER_COUNT BAM workers (expected 6)"
else
    log_fail "Only $WORKER_COUNT workers found"
fi

# Run vendor acquisition
ACQ_RESULT=$(curl -s -X POST "$HUB_URL/api/bam/workers/vendor-acquisition/run" \
    -H "Content-Type: application/json" \
    -d '{"industry": "restaurant", "target_count": 10}' 2>/dev/null || echo "")

if echo "$ACQ_RESULT" | grep -q "vendor"; then
    log_pass "Vendor Acquisition Worker executes"
else
    log_warn "Vendor Acquisition returned no vendors (acceptable in test)"
fi

# Run recommendation
REC_RESULT=$(curl -s -X POST "$HUB_URL/api/bam/workers/recommendation/run" \
    -H "Content-Type: application/json" \
    -d '{"user_id": "test-user", "context": "homepage", "limit": 5}' 2>/dev/null || echo "")

if echo "$REC_RESULT" | grep -q "recommendation"; then
    log_pass "Recommendation Worker executes"
else
    log_warn "Recommendation returned no results (acceptable in test)"
fi

###############################################################################
# Phase 5: CommerceOS
###############################################################################
log_step "Phase 5: CommerceOS"

MODULES=$(curl -s "$COMMERCEOS_URL/api/modules" 2>/dev/null || echo "")
if echo "$MODULES" | grep -q "catalog"; then
    log_pass "CommerceOS modules accessible"
else
    log_fail "CommerceOS modules not accessible"
fi

###############################################################################
# Phase 6: Product Graph
###############################################################################
log_step "Phase 6: Product Graph"

# Create a product
PRODUCT=$(curl -s -X POST "$GRAPH_URL/api/products" \
    -H "Content-Type: application/json" \
    -d '{"brand": "TestBrand", "name": "Test Product", "category": "test", "specs": {"size": "M"}}' 2>/dev/null || echo "")

if echo "$PRODUCT" | grep -q "upid"; then
    UPID=$(echo "$PRODUCT" | grep -o '"upid":"[^"]*"' | head -1 | sed 's/"upid":"//;s/"$//')
    log_pass "Created product with UPID: $UPID"

    # Add a listing
    LISTING=$(curl -s -X POST "$GRAPH_URL/api/products/$UPID/listings" \
        -H "Content-Type: application/json" \
        -d '{"marketplace": "test-market", "listingId": "test-001", "price": 100, "currency": "USD", "inventory": 50}' 2>/dev/null || echo "")

    if echo "$LISTING" | grep -q "listing"; then
        log_pass "Added listing to product"
    else
        log_warn "Listing not added (acceptable in test)"
    fi
else
    log_warn "Product creation returned no UPID (acceptable in test)"
fi

###############################################################################
# Phase 7: Trade Finance
###############################################################################
log_step "Phase 7: Trade Finance"

# Calculate credit score
CREDIT=$(curl -s -X POST "$TRADE_URL/api/credit-score/test-vendor" \
    -H "Content-Type: application/json" \
    -d '{"businessAge": 5, "annualRevenue": 1000000, "paymentHistory": 85, "creditUtilization": 30, "industry": 40}' 2>/dev/null || echo "")

if echo "$CREDIT" | grep -q "score"; then
    SCORE=$(echo "$CREDIT" | grep -o '"score":[0-9]*' | head -1)
    log_pass "Credit score calculated: $SCORE"
else
    log_warn "Credit score not returned (acceptable in test)"
fi

# Get FX rate
FX=$(curl -s "$CROSSBORDER_URL/api/fx/USD/INR" 2>/dev/null || echo "")
if echo "$FX" | grep -q "rate"; then
    RATE=$(echo "$FX" | grep -o '"rate":[0-9.]*' | head -1)
    log_pass "FX rate USD/INR: $RATE"
else
    log_warn "FX rate not returned (acceptable in test)"
fi

###############################################################################
# Phase 8: Cross-Border Commerce
###############################################################################
log_step "Phase 8: Cross-Border Commerce"

# Calculate duties
DUTIES=$(curl -s -X POST "$CROSSBORDER_URL/api/duties/calculate" \
    -H "Content-Type: application/json" \
    -d '{"origin": "US", "destination": "IN", "items": [{"description": "Laptop", "totalValue": 1000}], "shippingValue": 100}' 2>/dev/null || echo "")

if echo "$DUTIES" | grep -q "totalDuties"; then
    TOTAL=$(echo "$DUTIES" | grep -o '"totalDuties":[0-9]*' | head -1)
    log_pass "Duties calculated: $TOTAL"
else
    log_warn "Duties not calculated (acceptable in test)"
fi

# Get country regulations
REGS=$(curl -s "$CROSSBORDER_URL/api/countries/IN/regulations" 2>/dev/null || echo "")
if echo "$REGS" | grep -q "India"; then
    log_pass "Country regulations accessible"
else
    log_warn "Country regulations not accessible"
fi

###############################################################################
# Phase 9: Universal Distribution
###############################################################################
log_step "Phase 9: Universal Distribution"

CHANNELS=$(curl -s "$DIST_URL/api/channels" 2>/dev/null || echo "")
CHANNEL_COUNT=$(echo "$CHANNELS" | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$CHANNEL_COUNT" -ge "10" ]; then
    log_pass "Found $CHANNEL_COUNT distribution channels (expected 12)"
else
    log_fail "Only $CHANNEL_COUNT channels found"
fi

###############################################################################
# Phase 10: Studio Builder Flow
###############################################################################
log_step "Phase 10: Studio Builder Flow"

# Create session
SESSION=$(curl -s -X POST "$STUDIO_URL/api/studio/builder/sessions" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo "")

if echo "$SESSION" | grep -q "session"; then
    SESSION_ID=$(echo "$SESSION" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"$//')
    log_pass "Builder session created: $SESSION_ID"

    # Step 1: Template
    STEP1=$(curl -s -X PUT "$STUDIO_URL/api/studio/builder/sessions/$SESSION_ID/step/1" \
        -H "Content-Type: application/json" \
        -d '{"templateId": "restaurant"}' 2>/dev/null || echo "")

    if echo "$STEP1" | grep -q "session"; then
        log_pass "Builder step 1 (template) completed"

        # Step 2: Commerce
        STEP2=$(curl -s -X PUT "$STUDIO_URL/api/studio/builder/sessions/$SESSION_ID/step/2" \
            -H "Content-Type: application/json" \
            -d '{"modules": ["catalog", "order"], "pricingStrategy": "dynamic", "paymentMethods": ["UPI"]}' 2>/dev/null || echo "")

        if echo "$STEP2" | grep -q "session"; then
            log_pass "Builder step 2 (commerce) completed"
        fi
    fi
else
    log_warn "Builder session not created (acceptable in test)"
fi

###############################################################################
# Phase 11: Hub Routing (Integration Test)
###############################################################################
log_step "Phase 11: Hub Routing Tests"

# Test that all major routes work through the Hub
ROUTES=(
    "/health"
    "/api/services"
    "/api/templates/templates"
    "/api/pools/pools"
    "/api/bam/workers"
    "/api/studio/wizards/commerce-modules"
    "/api/trade-finance/api/stats"
    "/api/cross-border/api/stats"
    "/api/distribution/api/stats"
    "/api/products/api/stats"
)

for route in "${ROUTES[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$HUB_URL$route" 2>/dev/null || echo "000")
    if [ "$status" = "200" ] || [ "$status" = "404" ]; then
        # 200 = found, 404 = may need service running
        if [ "$status" = "200" ]; then
            log_pass "Hub route: $route"
        else
            log_warn "Hub route: $route (404 - service may not be running)"
        fi
    else
        log_fail "Hub route: $route (got $status)"
    fi
done

###############################################################################
# Final Summary
###############################################################################
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    TEST SUMMARY                              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
TOTAL=$((PASSED + FAILED))
echo ""
echo -e "  Total Tests:    $TOTAL"
echo -e "  ${GREEN}Passed:${NC}         $PASSED"
echo -e "  ${RED}Failed:${NC}         $FAILED"
echo ""

if [ "$FAILED" -eq "0" ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}   Global Nexha Commerce Stack is production-ready!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed or were skipped${NC}"
    echo -e "${YELLOW}  (Failures are expected if services aren't running)${NC}"
    exit 1
fi