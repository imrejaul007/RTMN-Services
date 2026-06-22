#!/bin/bash
# k6 Performance Test Runner
# Usage: ./run-tests.sh [smoke|load|stress|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL=${BASE_URL:-"http://localhost:4530"}
TENANT_ID=${TENANT_ID:-"test-tenant"}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== HOJAI SkillNet Performance Tests ===${NC}"
echo "Base URL: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Run tests based on argument
case "${1:-all}" in
    smoke)
        echo -e "${YELLOW}Running Smoke Test...${NC}"
        k6 run "$SCRIPT_DIR/smoke-test.js" \
            -e BASE_URL="$BASE_URL" \
            -e TENANT_ID="$TENANT_ID"
        ;;
    load)
        echo -e "${YELLOW}Running Load Test...${NC}"
        k6 run "$SCRIPT_DIR/load-test.js" \
            -e BASE_URL="$BASE_URL" \
            -e TENANT_ID="$TENANT_ID"
        ;;
    stress)
        echo -e "${YELLOW}Running Stress Test...${NC}"
        k6 run "$SCRIPT_DIR/stress-test.js" \
            -e BASE_URL="$BASE_URL" \
            -e TENANT_ID="$TENANT_ID"
        ;;
    all)
        echo -e "${YELLOW}Running All Tests...${NC}"
        echo ""
        echo "1. Smoke Test..."
        k6 run "$SCRIPT_DIR/smoke-test.js" -e BASE_URL="$BASE_URL" -e TENANT_ID="$TENANT_ID"
        echo ""
        echo "2. Load Test..."
        k6 run "$SCRIPT_DIR/load-test.js" -e BASE_URL="$BASE_URL" -e TENANT_ID="$TENANT_ID"
        echo ""
        echo "3. Stress Test..."
        k6 run "$SCRIPT_DIR/stress-test.js" -e BASE_URL="$BASE_URL" -e TENANT_ID="$TENANT_ID"
        ;;
    cloud)
        echo -e "${YELLOW}Running on k6 Cloud...${NC}"
        k6 cloud "$SCRIPT_DIR/load-test.js" -e BASE_URL="$BASE_URL" -e TENANT_ID="$TENANT_ID"
        ;;
    *)
        echo "Usage: $0 [smoke|load|stress|all|cloud]"
        echo ""
        echo "Tests:"
        echo "  smoke  - Basic functionality test (5 VUs, 2 min)"
        echo "  load   - Performance under load (100-200 VUs, 15 min)"
        echo "  stress - Breakpoint testing (500-1000 VUs, 10 min)"
        echo "  all    - Run all tests"
        echo "  cloud  - Run load test on k6 Cloud"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== Tests Complete ===${NC}"
