#!/bin/bash
# HOJAI InternetOS Startup Script
# Starts the InternetOS API server and all related services

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              HOJAI InternetOS - Starting                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INTERNET_OS_DIR="$(dirname "$SCRIPT_DIR")/platform/internet-os"

# Environment variables
export INTERNET_OS_PORT="${INTERNET_OS_PORT:-4595}"
export NODE_ENV="${NODE_ENV:-development}"

# Service URLs (reuse existing HOJAI services)
export MEMORY_OS_URL="${MEMORY_OS_URL:-http://localhost:4703}"
export TWIN_OS_URL="${TWIN_OS_URL:-http://localhost:4705}"
export KNOWLEDGE_EXTRACTION_URL="${KNOWLEDGE_EXTRACTION_URL:-http://localhost:4784}"
export WEBHOOK_BUS_URL="${WEBHOOK_BUS_URL:-http://localhost:4110}"
export SKILL_OS_URL="${SKILL_OS_URL:-http://localhost:4743}"

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Port:          $INTERNET_OS_PORT"
echo "  Environment:   $NODE_ENV"
echo ""
echo -e "${YELLOW}Integrations (existing services):${NC}"
echo "  MemoryOS:       $MEMORY_OS_URL"
echo "  TwinOS Hub:     $TWIN_OS_URL"
echo "  Knowledge:      $KNOWLEDGE_EXTRACTION_URL"
echo "  Webhook Bus:    $WEBHOOK_BUS_URL"
echo "  SkillOS:        $SKILL_OS_URL"

# Check prerequisites
echo ""
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if port is available
if lsof -Pi :$INTERNET_OS_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "  ${RED}✗ Port $INTERNET_OS_PORT is already in use${NC}"
    echo "  Trying to find and kill existing process..."
    PID=$(lsof -Pi :$INTERNET_OS_PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null || true
        sleep 1
        echo -e "  ${YELLOW}  Killed PID $PID${NC}"
    fi
fi

# Build actor-runtime
echo ""
echo -e "${YELLOW}Building actor-runtime...${NC}"
cd "$INTERNET_OS_DIR/actor-runtime"
if npm run build 2>&1; then
    echo -e "  ${GREEN}✓ actor-runtime built successfully${NC}"
else
    echo -e "  ${RED}✗ Failed to build actor-runtime${NC}"
    exit 1
fi

# Build watcher-runtime
echo ""
echo -e "${YELLOW}Building watcher-runtime...${NC}"
cd "$INTERNET_OS_DIR/watcher-runtime"
if npm run build 2>&1; then
    echo -e "  ${GREEN}✓ watcher-runtime built successfully${NC}"
else
    echo -e "  ${RED}✗ Failed to build watcher-runtime${NC}"
    exit 1
fi

# Build API server
echo ""
echo -e "${YELLOW}Building API server...${NC}"
cd "$INTERNET_OS_DIR/api-server"
if npm install 2>&1 | tail -5; then
    echo -e "  ${GREEN}✓ Dependencies installed${NC}"
fi
if npm run build 2>&1; then
    echo -e "  ${GREEN}✓ API server built successfully${NC}"
else
    echo -e "  ${RED}✗ Failed to build API server${NC}"
    exit 1
fi

# Start API server
echo ""
echo -e "${YELLOW}Starting InternetOS API server...${NC}"
cd "$INTERNET_OS_DIR/api-server"
npm start &
API_PID=$!

# Wait for server to start
sleep 3

# Health check
echo ""
echo -e "${YELLOW}Health check...${NC}"
if curl -s http://localhost:$INTERNET_OS_PORT/health >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓ API server is healthy${NC}"
else
    echo -e "  ${RED}✗ API server health check failed${NC}"
    echo "  Server may not have started correctly"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              HOJAI InternetOS - Running                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  API Server:     http://localhost:$INTERNET_OS_PORT             ║"
echo "║  Health:        http://localhost:$INTERNET_OS_PORT/health      ║"
echo "║  API Docs:       http://localhost:$INTERNET_OS_PORT/api          ║"
echo "║                                                              ║"
echo "║  API PID:        $API_PID                                       ║"
echo "║                                                              ║"
echo "║  Press Ctrl+C to stop                                         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Wait for server
wait $API_PID
