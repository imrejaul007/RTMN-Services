#!/bin/bash
# Health check script
# Usage: ./health-check.sh [url]

URL=${1:-http://localhost:4570}

echo "Checking $URL..."

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL/health)

if [ "$STATUS" = "200" ]; then
  echo "✓ Healthy"
  exit 0
else
  echo "✗ Unhealthy (HTTP $STATUS)"
  exit 1
fi
