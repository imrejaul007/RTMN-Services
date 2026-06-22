#!/usr/bin/env bash
# Decision Intelligence end-to-end smoke test
# Asserts that all 16 public routes respond correctly.
# Requires the service running on $PORT (default 4756) with DECISION_INTELLIGENCE_REQUIRE_AUTH=false.

set -euo pipefail
PORT="${PORT:-4756}"
BASE="http://127.0.0.1:${PORT}"
PASS=0
FAIL=0

assert_status() {
  local label="$1" expected="$2" got="$3"
  if [[ "$got" == "$expected" ]]; then
    echo "  ✅ ${label}: ${got}"
    PASS=$((PASS + 1))
  else
    echo "  ❌ ${label}: expected ${expected}, got ${got}"
    FAIL=$((FAIL + 1))
  fi
}

check() {
  local label="$1" method="$2" path="$3" expected="$4" body="${5:-}"
  local code
  if [[ -n "$body" ]]; then
    code=$(curl -s -o /tmp/di-resp.json -w '%{http_code}' \
      -X "$method" -H 'Content-Type: application/json' \
      -d "$body" "${BASE}${path}")
  else
    code=$(curl -s -o /tmp/di-resp.json -w '%{http_code}' \
      -X "$method" "${BASE}${path}")
  fi
  assert_status "$label" "$expected" "$code"
}

echo "🧪 Decision Intelligence e2e (port ${PORT})"
echo

# Health + info
check "GET /api/health → 200"             GET    "/api/health"                  200
check "GET /api/methods → 200"            GET    "/api/methods"                 200
check "GET /api/stats → 200"              GET    "/api/stats"                   200
check "GET /api/audit → 200"              GET    "/api/audit"                   200

# Auth bypass: with DECISION_INTELLIGENCE_REQUIRE_AUTH=false, valid bodies should work
check "POST /api/recommend/event → 201"   POST   "/api/recommend/event"         201 \
  '{"userId":"u1","itemId":"i1","eventType":"view"}'
check "POST /api/recommend/items → 200"   POST   "/api/recommend/items"         200 \
  '{"userId":"u1","method":"hybrid","k":3}'
check "POST /api/recommend/items/batch → 200" POST "/api/recommend/items/batch" 200 \
  '{"userIds":["u1"],"k":2}'

# Similarity lookup
check "GET /api/recommend/similarity/:id → 200" GET "/api/recommend/similarity/i1" 200

# NBA
check "GET /api/nba/actions → 200"        GET    "/api/nba/actions"             200
check "POST /api/nba/actions → 201"       POST   "/api/nba/actions"             201 \
  '{"id":"demo-nba-1","name":"Demo","description":"demo","goal":"revenue","score":0.5}'
check "POST /api/nba → 200"               POST   "/api/nba"                     200 \
  '{"customer":{"id":"c1","tier":"gold"},"goal":"revenue"}'

# Multi-criteria decision
check "POST /api/decision/wsm → 200"      POST   "/api/decision/wsm"            200 \
  '{"alternatives":[{"name":"A","scores":{"cost":0.7,"speed":0.5}}],"weights":{"cost":0.5,"speed":0.5}}'
check "POST /api/decision/topsis → 200"   POST   "/api/decision/topsis"         200 \
  '{"alternatives":[{"name":"A","scores":{"cost":0.7,"speed":0.5}}],"criteria":["cost","speed"],"weights":{"cost":0.5,"speed":0.5},"impacts":{"cost":"negative","speed":"positive"}}'

# Validation: empty bodies should 400 (not 401, because bypass is on)
check "POST /api/decision/wsm (empty) → 400"  POST "/api/decision/wsm"   400 '{}'
check "POST /api/recommend/event (bad event) → 400" POST "/api/recommend/event" 400 \
  '{"userId":"u","itemId":"i","eventType":"unknown"}'

# 404
check "GET /unknown → 404"                GET    "/api/does-not-exist"          404

echo
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
[[ "$FAIL" -eq 0 ]] || exit 1
echo "✅ All e2e checks passed"