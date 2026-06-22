#!/bin/bash
# RAZO Keyboard - Start All Services
# Usage: ./start-all.sh

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🎹 RAZO Keyboard - Starting All Services                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

echo ""
echo -e "${GREEN}Starting Cloud Services (ports 4631-4636)...${NC}"
npx tsx CloudServices/index.ts &
CLOUD_PID=$!

echo -e "${GREEN}Starting Predictive Engine (port 4640)...${NC}"
npx tsx PREDICTIVE-ENGINE/index.ts &
PREDICTIVE_PID=$!

echo -e "${GREEN}Starting Intent Router (port 4650)...${NC}"
npx tsx INTENT-ROUTER/index.ts &
INTENT_PID=$!

echo -e "${GREEN}Starting Smart Suggestions (port 4651)...${NC}"
npx tsx SMART-SUGGESTIONS/index.ts &
SUGGESTIONS_PID=$!

echo -e "${GREEN}Starting Action Cards (port 4652)...${NC}"
npx tsx ACTION-CARDS/index.ts &
ACTIONS_PID=$!

echo -e "${GREEN}Starting Command Bar (port 4653)...${NC}"
npx tsx COMMAND-BAR/index.ts &
COMMAND_PID=$!

echo -e "${GREEN}Starting Deep Links (port 4654)...${NC}"
npx tsx DEEP-LINKS/index.ts &
DEEPLINKS_PID=$!

echo -e "${GREEN}Starting Keyboard Feed (port 4655)...${NC}"
npx tsx KEYBOARD-FEED/index.ts &
FEED_PID=$!

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  All services started!                                    ║"
echo "║                                                           ║"
echo "║  Cloud Services:  4631-4636                              ║"
echo "║  Core Services:    4640-4655                              ║"
echo "║                                                           ║"
echo "║  PIDs: $CLOUD_PID $PREDICTIVE_PID $INTENT_PID $SUGGESTIONS_PID          ║"
echo "║        $ACTIONS_PID $COMMAND_PID $DEEPLINKS_PID $FEED_PID                ║"
echo "║                                                           ║"
echo "║  Press Ctrl+C to stop all services                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"

# Wait for any process to exit
wait
