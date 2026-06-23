#!/usr/bin/env bash
set -euo pipefail
PORT="${TENANT_MANAGER_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export TENANT_MANAGER_REQUIRE_AUTH=false
unset NODE_ENV

cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/tenant-manager

node src/index.js &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT

for i in {1..30}; do
  if curl -fsS "http://localhost:$PORT/api/health" > /dev/null 2>&1; then break; fi
  sleep 0.5
done

echo "PORT=$PORT"
echo "--- bad plan test (e2e style) ---"
RANDOM=12345
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"slug\":\"bad-$RANDOM\",\"plan\":\"galactic\"}")
echo "CODE=$CODE"
