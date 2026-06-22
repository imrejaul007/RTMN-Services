#!/bin/bash
# Hojai AI - Test All Services
# Version: 1.0 | Date: May 29, 2026

set -e

echo "=============================================="
echo "HOJAI AI - TEST ALL SERVICES"
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Test function
test_service() {
    local name=$1
    local port=$2
    local endpoint=$3
    
    echo -n "Testing $name (port $port)... "
    
    if curl -s -f http://localhost:$port$endpoint > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC}"
        ((FAILED++))
    fi
}

echo ""
echo "Testing Hojai Core Services..."
echo "--------------------------------------------"

test_service "API Gateway" 4500 "/health"
test_service "Governance" 4501 "/health"
test_service "Event" 4510 "/health"
test_service "Memory" 4520 "/health"
test_service "Intelligence" 4530 "/health"
test_service "Agents" 4550 "/health"
test_service "Workflow" 4560 "/health"
test_service "Communications" 4570 "/health"
test_service "Hyperlocal" 4580 "/health"
test_service "Data" 4590 "/health"

echo ""
echo "Testing Hojai Industry..."
echo "--------------------------------------------"

test_service "Industry" 4700 "/health"

echo ""
echo "Testing REZ Intelligence..."
echo "--------------------------------------------"

test_service "REZ Intelligence" 4100 "/health"

echo ""
echo "=============================================="
echo "TEST RESULTS"
echo "=============================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
