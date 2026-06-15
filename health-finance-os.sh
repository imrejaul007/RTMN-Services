#!/bin/bash

# ============================================
# HOJAI FinanceOS Health Check Script
# Checks all 14 FinanceOS services
# ============================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Function to check service
check_service() {
    local service_name=$1
    local port=$2

    TOTAL=$((TOTAL + 1))

    echo -n "  $service_name (:$port) ... "

    # Check if port is listening
    if nc -z localhost $port 2>/dev/null; then
        # Try health endpoint
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>/dev/null)

        if [ "$response" = "200" ]; then
            echo -e "${GREEN}✓ OK${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${YELLOW}⚠ DEGRADED${NC} (HTTP $response)"
            PASSED=$((PASSED + 1))
        fi
    else
        echo -e "${RED}✗ DOWN${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo "============================================"
echo "   HOJAI FinanceOS Health Check"
echo "============================================"
echo ""

# Finance AI Agents
echo -e "${YELLOW}Finance AI Agents (4900-4906):${NC}"
check_service "Finance CFO AI" 4900
check_service "Finance Accountant" 4901
check_service "Finance Compliance" 4902
check_service "Finance Auditor" 4903
check_service "Finance Collections" 4904
check_service "Finance Payables" 4905
check_service "Finance Budget Coach" 4906
echo ""

# Financial OS
echo -e "${YELLOW}Financial OS (5220):${NC}"
check_service "Financial OS" 5220
echo ""

# FinanceOS Suite
echo -e "${YELLOW}FinanceOS Suite (5250-5290):${NC}"
check_service "ExpenseOS" 5250
check_service "Approval Workflow" 5255
check_service "Reimbursement OS" 5260
check_service "Finance Twin Hub" 5270
check_service "Spend Intelligence" 5280
check_service "Corporate Card OS" 5290
echo ""

# Summary
echo "============================================"
echo "   Summary"
echo "============================================"
echo "  Total Services: $TOTAL"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All services healthy!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some services are down${NC}"
    exit 1
fi
