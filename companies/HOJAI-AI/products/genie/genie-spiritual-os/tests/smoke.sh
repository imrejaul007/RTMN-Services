#!/usr/bin/env bash
# genie-spiritual-os smoke test - starts service, hits key endpoints, cleans up
set -e

PORT="${PORT:-4729}"
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ Starting genie-spiritual-os on port $PORT..."
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
curl -sf "http://localhost:$PORT/health" | grep -q "Genie Spiritual OS" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /prayer/categories... "
curl -sf "http://localhost:$PORT/prayer/categories" | grep -q "categories" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /meditation/types... "
curl -sf "http://localhost:$PORT/meditation/types" | grep -q "breath" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /reflection/prompts... "
curl -sf "http://localhost:$PORT/reflection/prompts?count=2" | grep -q "prompts" && echo "✓" || { echo "✗"; exit 1; }

echo -n "  /insights/daily-focus... "
curl -sf "http://localhost:$PORT/insights/daily-focus" | grep -q "title" && echo "✓" || { echo "✗"; exit 1; }

echo "✓ All smoke checks passed"