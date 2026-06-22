#!/bin/bash

# Nexha Commerce Network - Start Script

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   🌐 NEXHA COMMERCE NETWORK - Agent Economy Exchange      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

echo "Starting Nexha Commerce Network..."
npm run dev &>/dev/null &

sleep 3

# Health check
status=$(curl -s "http://localhost:4600/health" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$status" = "healthy" ]; then
    echo "✅ Nexha Commerce Network running on port 4600"
else
    echo "⚠️  Nexha Commerce Network may not be responding"
fi

echo ""
echo "📌 Endpoints:"
echo "   • Network API:    http://localhost:4600"
echo "   • Health:        http://localhost:4600/health"
echo "   • Register Node: POST http://localhost:4600/api/nodes"
echo "   • Discover:      GET  http://localhost:4600/api/discover?q=keyword"
echo ""
