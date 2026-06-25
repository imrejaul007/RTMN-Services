#!/usr/bin/env bash
# genie-life-replay smoke test - starts service, hits key endpoints, cleans up
set -e

PORT="${PORT:-4730}"
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ Starting genie-life-replay on port $PORT..."
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-smoke-$(date +%s)}" \
  PORT="$PORT" \
  INFERENCE_STUB_MODE=true \
  node "$SERVICE_DIR/src/index.js" &
SVC_PID=$!
trap "kill -TERM $SVC_PID 2>/dev/null || true" EXIT

# Wait for /health to return 200
for i in {1..40}; do
  if curl -sf "http://localhost:$PORT/health" > /dev/null; then
    echo "✓ service ready after ${i} attempts"
    break
  fi
  sleep 0.25
done

echo "▶ Running smoke checks..."
echo -n "  /health... "
curl -sf "http://localhost:$PORT/health" | grep -q "Genie Life Replay" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /replay/get/r1 (seeded)... "
curl -sf "http://localhost:$PORT/replay/get/r1" | grep -q "title" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /replay/history/user-001... "
curl -sf "http://localhost:$PORT/replay/history/user-001" | grep -q "replays" && echo "✓" || { echo "✗"; exit 1; }

echo "✓ All smoke checks passed"