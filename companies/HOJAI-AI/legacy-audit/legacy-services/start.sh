#!/bin/bash
# Hojai Flow - Start Script

set -e

echo "🚀 Starting Hojai Flow..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Start MongoDB (if docker available)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}Starting MongoDB...${NC}"
    docker run -d --name hojai-mongodb -p 27017:27017 mongo:7 || echo "MongoDB already running or docker not available"
fi

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"

cd "$(dirname "$0")/hojai-flow-service"
npm install

cd "$(dirname "$0")/voice-service"
npm install 2>/dev/null || echo "Voice service skipped"

# Start backend
cd "$(dirname "$0")/hojai-flow-service"
echo -e "${GREEN}Starting Hojai Flow Service on port 4580...${NC}"
npm run dev &

echo ""
echo -e "${GREEN}✅ Hojai Flow started!"
echo ""
echo "Services:"
echo "  - Hojai Flow: http://localhost:4580"
echo "  - Health: http://localhost:4580/health"
echo ""
echo "Next:"
echo "  - cd hojai-flow-app && npx expo start"
echo ""
