#!/bin/bash

# RTMN Integration Services - Stop All Script
# Version 1.0.0 | Date: June 8, 2026

echo "Stopping RTMN Integration Services..."

# Kill all node processes for RTMN services
pkill -f "unified-api-gateway" 2>/dev/null && echo "✓ API Gateway stopped" || true
pkill -f "help-center" 2>/dev/null && echo "✓ Help Center stopped" || true
pkill -f "corpperks-rabtul" 2>/dev/null && echo "✓ Integration stopped" || true
pkill -f "unified-dashboard" 2>/dev/null && echo "✓ Dashboard stopped" || true

echo ""
echo "All services stopped."

# Kill all node processes (if running specific services not found)
if pgrep -f "RTMN\|rtmn" > /dev/null; then
    echo "Cleaning up remaining processes..."
    pkill -f "RTMN" 2>/dev/null || true
fi

echo "Done."
