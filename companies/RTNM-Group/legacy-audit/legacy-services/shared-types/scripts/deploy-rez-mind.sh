#!/bin/bash

# ReZ Mind - Quick Deploy Script
# Usage: ./scripts/deploy-rez-mind.sh
#
# IMPORTANT: Uses MongoDB Atlas - all ReZ apps share the rez-app database

set -e

echo "═══════════════════════════════════════════════════════"
echo "  ReZ Mind - Intent Graph Deploy Script"
echo "═══════════════════════════════════════════════════════"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PORT=3005
# MongoDB Atlas - ReZ ecosystem database (all apps use this!)
MONGODB_URI="${MONGODB_URI:-mongodb+srv://work_db_user:RmptskyDLFNSJGCA@cluster0.ku78x6g.mongodb.net/rez-app}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port)
      PORT="$2"
      shift 2
      ;;
    --mongodb-uri)
      MONGODB_URI="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

cd "$(dirname "$0")/.."

echo ""
echo "Step 1: Checking prerequisites..."
echo "───────────────────────────────────────────────────────"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm $(npm --version)"

# Check MongoDB URI
if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}✗ MONGODB_URI not set${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} MongoDB URI configured"

echo ""
echo "Step 2: Installing dependencies..."
echo "───────────────────────────────────────────────────────"

cd packages/rez-intent-graph
npm install

if [ "$SKIP_BUILD" != true ]; then
    echo ""
    echo "Step 3: Building..."
    echo "───────────────────────────────────────────────────────"
    npm run build
fi

echo ""
echo "Step 4: Starting server..."
echo "───────────────────────────────────────────────────────"

export MONGODB_URI="$MONGODB_URI"
export PORT="$PORT"
export NODE_ENV="${NODE_ENV:-production}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "  ${GREEN}ReZ Mind is starting on port $PORT${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Endpoints:"
echo "  Health:     http://localhost:$PORT/health"
echo "  Intent API: http://localhost:$PORT/api/intent"
echo ""
echo "MongoDB: Connected to rez-app database"
echo ""
echo "Press Ctrl+C to stop"
echo "═══════════════════════════════════════════════════════"

# Start the server
npm start
