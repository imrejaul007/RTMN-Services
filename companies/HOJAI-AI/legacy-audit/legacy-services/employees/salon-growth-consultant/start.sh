#!/bin/bash

# Salon Growth Consultant - Start Script
# Port: 4759

echo "========================================"
echo "  Salon Growth Consultant"
echo "  Expert Employee Service"
echo "========================================"
echo ""
echo "Starting service on port 4759..."
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Start the service
npm run dev
