#!/bin/bash
# Deploy all Hojai AI services
set -e
echo "🚀 Starting Hojai AI..."
docker compose up -d
echo "✅ All services started"
docker compose ps
