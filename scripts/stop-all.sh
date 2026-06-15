#!/bin/bash
# Stop all RTMN services

pkill -f "node.*src/index.js" 2>/dev/null
echo "All RTMN services stopped"
