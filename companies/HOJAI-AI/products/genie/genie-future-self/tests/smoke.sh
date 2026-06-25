#!/usr/bin/env bash
# genie-future-self smoke test
set -e

PORT="${PORT:-4731}"
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ Starting genie-future-self on port $PORT..."
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-smoke-$(date +%s)}" \
  PORT="$PORT" \
  INFERENCE_STUB_MODE=true \
  node "$SERVICE_DIR/src/index.js" &
SVC_PID=$!
trap "kill -TERM $SVC_PID 2>/dev/null || true" EXIT

for i in {1..40}; do
  if curl -sf "http://localhost:$PORT/health" > /dev/null; then
    echo "✓ service ready"
    break
  fi
  sleep 0.25
done

echo "▶ Running smoke checks..."
echo -n "  /health... "
curl -sf "http://localhost:$PORT/health" | grep -q "Genie Future Self" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /profile/get/user-001... "
curl -sf "http://localhost:$PORT/profile/get/user-001" | grep -q "values" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /advice/get/a1... "
curl -sf "http://localhost:$PORT/advice/get/a1" | grep -q "advice" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /letter/read/l1... "
curl -sf "http://localhost:$PORT/letter/read/l1" | grep -q "body" && echo "✓" || { echo "✗"; exit 1; }

echo "✓ All smoke checks passed"