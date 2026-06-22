#!/bin/bash

# Restaurant Growth Consultant - Startup Script
# Port: 4758

echo "🍽️  Starting Restaurant Growth Consultant..."

cd "$(dirname "$0")"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start the service
echo "🚀 Starting service on port 4758..."
npm run dev
