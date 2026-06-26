#!/bin/bash
# ============================================================
# Employee Twin Ecosystem - Startup Script
# ============================================================
# This script starts all Employee Twin services
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
PLATFORM_DIR="$BASE_DIR/platform"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Employee Twin Ecosystem - Startup Script           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to start a service
start_service() {
    local name=$1
    local dir=$2
    local port=$3

    echo -e "${YELLOW}Starting ${name} on port ${port}...${NC}"

    if [ -d "$dir" ]; then
        cd "$dir"
        if [ -f "package.json" ]; then
            # Check if node_modules exists
            if [ ! -d "node_modules" ]; then
                echo "  Installing dependencies..."
                npm install 2>/dev/null || true
            fi

            # Start in background
            npm run dev > /dev/null 2>&1 &
            echo -e "  ${GREEN}✓ ${name} started${NC}"
        else
            echo -e "  ${RED}✗ package.json not found${NC}"
        fi
    else
        echo -e "  ${RED}✗ Directory not found: $dir${NC}"
    fi

    cd "$PLATFORM_DIR"
}

# Check for required tools
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites met. Starting services...${NC}"
echo ""

# Phase 1: Core Twins (Ports 4741-4746)
echo -e "${BLUE}═══ Phase 1: Core Twins ═══${NC}"
start_service "Communication Twin" "$PLATFORM_DIR/twins/communication-twin" "4743"
start_service "Workflow Twin" "$PLATFORM_DIR/twins/workflow-twin" "4741"
start_service "Decision Twin" "$PLATFORM_DIR/twins/decision-twin" "4742"
start_service "Relationship Twin" "$PLATFORM_DIR/twins/relationship-twin" "4744"
start_service "Reputation Twin" "$PLATFORM_DIR/twins/reputation-twin" "4745"
start_service "Behavioral Twin" "$PLATFORM_DIR/twins/behavioral-twin" "4746"
start_service "Knowledge Twin" "$PLATFORM_DIR/twins/knowledge-twin" "4739"

echo ""

# Phase 2: Observation Layer (Ports 4747-4750)
echo -e "${BLUE}═══ Phase 2: Observation Layer ═══${NC}"
start_service "Twin Observer" "$PLATFORM_DIR/twins/twin-observer" "4747"
start_service "Skill Wallet" "$PLATFORM_DIR/twins/skill-wallet" "4750"

echo ""

# Phase 3: Agents (Ports 4751-4752)
echo -e "${BLUE}═══ Phase 3: Agents ═══${NC}"
start_service "Browser Agent" "$PLATFORM_DIR/agents/browser-agent" "4751"
start_service "Desktop Agent" "$PLATFORM_DIR/agents/desktop-agent" "4752"

echo ""

# Phase 4: Skill Economy (Ports 4754-4759)
echo -e "${BLUE}═══ Phase 4: Skill Economy ═══${NC}"
start_service "Skill Creator Studio" "$PLATFORM_DIR/skills/skill-creator-studio" "4754"
start_service "Skill Certification" "$PLATFORM_DIR/skills/skill-certification" "4755"
start_service "Skill Analytics" "$PLATFORM_DIR/skills/skill-analytics" "4756"
start_service "Creator Payout" "$PLATFORM_DIR/skills/creator-payout" "4757"
start_service "BAM Skill Adapter" "$PLATFORM_DIR/skills/bam-skill-adapter" "4758"
start_service "Enterprise Skill Portal" "$PLATFORM_DIR/skills/enterprise-skill-portal" "4759"

echo ""

# Phase 5: Autonomous Execution (Ports 4760-4764)
echo -e "${BLUE}═══ Phase 5: Autonomous Execution ═══${NC}"
start_service "Autonomy Controller" "$PLATFORM_DIR/twins/twin-autonomy-controller" "4760"
start_service "24x7 Execution Engine" "$PLATFORM_DIR/twins/execution-engine-24x7" "4761"
start_service "Twin Shadow Mode" "$PLATFORM_DIR/twins/twin-shadow-mode" "4762"
start_service "Emergency Stop" "$PLATFORM_DIR/twins/emergency-stop" "4763"
start_service "Notification Orchestrator" "$PLATFORM_DIR/twins/notification-orchestrator" "4764"

echo ""

# Phase 6: Polish (Ports 4770-4773)
echo -e "${BLUE}═══ Phase 6: Polish ═══${NC}"
start_service "Twin Dashboard" "$PLATFORM_DIR/twins/twin-dashboard" "4770"
start_service "Twin Mobile" "$PLATFORM_DIR/twins/twin-mobile" "4771"
start_service "Twin Analytics" "$PLATFORM_DIR/twins/twin-analytics" "4772"
start_service "Twin Health Monitor" "$PLATFORM_DIR/twins/twin-health-monitor" "4773"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Employee Twin Ecosystem - All Services Started         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Services running on ports:"
echo "  Phase 1 (Core Twins):      4739, 4741-4746"
echo "  Phase 2 (Observation):     4747, 4750"
echo "  Phase 3 (Agents):          4751-4752"
echo "  Phase 4 (Skill Economy):   4754-4759"
echo "  Phase 5 (Autonomous):      4760-4764"
echo "  Phase 6 (Polish):          4770-4773"
echo ""
echo -e "Run ${YELLOW}curl http://localhost:4773/api/health/services${NC} to check all services"
echo ""
