#!/bin/bash
# CompanyOS Startup Script
# Location: companies/HOJAI-AI/platform/company-os/scripts/start-company-os.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-4010}"
MANIFESTS_DIR="${MANIFESTS_DIR:-./manifests}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  CompanyOS Control Plane${NC}"
echo -e "${GREEN}========================================${NC}"

# Check for dependencies
check_dependencies() {
    echo -e "\n${YELLOW}Checking dependencies...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} Node.js $(node --version)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} npm $(npm --version)"
}

# Install dependencies
install_dependencies() {
    echo -e "\n${YELLOW}Installing dependencies...${NC}"
    cd "$PROJECT_DIR/control-plane"
    npm install
    cd "$PROJECT_DIR/composition-engine"
    npm install
    echo -e "  ${GREEN}✓${NC} Dependencies installed"
}

# Run tests
run_tests() {
    echo -e "\n${YELLOW}Running tests...${NC}"
    cd "$PROJECT_DIR/composition-engine"
    npm test -- --run
    echo -e "  ${GREEN}✓${NC} All tests passed"
}

# Start the server
start_server() {
    echo -e "\n${YELLOW}Starting CompanyOS Control Plane on port $PORT...${NC}"
    cd "$PROJECT_DIR/control-plane"
    PORT=$PORT MANIFESTS_DIR=$MANIFESTS_DIR npm start
}

# Parse arguments
case "${1:-start}" in
    start)
        check_dependencies
        install_dependencies
        start_server
        ;;
    test)
        check_dependencies
        install_dependencies
        run_tests
        ;;
    install)
        check_dependencies
        install_dependencies
        ;;
    dev)
        check_dependencies
        install_dependencies
        echo -e "\n${YELLOW}Starting in development mode...${NC}"
        cd "$PROJECT_DIR/control-plane"
        PORT=$PORT MANIFESTS_DIR=$MANIFESTS_DIR npm run dev
        ;;
    help)
        echo -e "${GREEN}CompanyOS Control Plane${NC}"
        echo ""
        echo "Usage: ./start-company-os.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start   - Install dependencies and start the server (default)"
        echo "  test    - Run tests"
        echo "  install - Install dependencies only"
        echo "  dev     - Start in development mode with hot reload"
        echo "  help    - Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  PORT           - Server port (default: 4010)"
        echo "  MANIFESTS_DIR  - Manifest storage directory (default: ./manifests)"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run './start-company-os.sh help' for usage"
        exit 1
        ;;
esac
