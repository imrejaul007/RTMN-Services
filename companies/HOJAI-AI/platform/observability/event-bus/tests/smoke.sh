#!/usr/bin/env bash
# tests/smoke.sh — basic health & listing checks against Event Bus
# Usage: bash tests/smoke.sh [PORT]   default 4510
set -u

PORT="${1:-4510}"
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

# Phase 2 (ADR-0009): the service uses @rtmn/shared/auth `requireAuth` on
# all write endpoints. Mint a base64 token via the same `createToken` helper
# so the test is self-contained and doesn't need a live CorpID.
SMOKE_TOKEN="$(node -e 'const t=Buffer.from(JSON.stringify({sub:"smoke-test",role:"owner",iat:Date.now(),exp:Date.now()+3600000})).toString("base64");console.log(t)')"
AUTH_HDR="Authorization: Bearer ${SMOKE_TOKEN}"

check() {
  local name="$1"
  local cmd="$2"
  local expect_substr="$3"
  local out
  out="$(eval "$cmd" 2>&1)"
  local rc=$?
  if [ $rc -eq 0 ] && [[ "$out" == *"$expect_substr"* ]]; then
    PASS=$((PASS + 1))
    printf "  \033[32mOK\033[0m   %s\n" "$name"
  else
    FAIL=$((FAIL + 1))
    printf "  \033[31mFAIL\033[0m %s\n" "$name"
    printf "       cmd:   %s\n" "$cmd"
    printf "       expect: %s\n" "$expect_substr"
    printf "       got:    %s\n" "$(printf '%s' "$out" | sed '$d')"
  fi
}

echo "Event Bus smoke tests against $BASE"
echo

# 1. /health
check "/health returns ok" \
  "curl -fsS $BASE/health" \
  '"status":"ok"'

# 2. /ready
check "/ready returns ready:true" \
  "curl -fsS $BASE/ready" \
  '"ready":true'

# 3. GET /api/events (seeded events exist)
check "GET /api/events lists seeded events" \
  "curl -fsS $BASE/api/events" \
  '"events"'

# 4. GET /api/events has order.created
check "GET /api/events contains order.created" \
  "curl -fsS $BASE/api/events" \
  'order.created'

# 5. GET /api/subscriptions (seeded one exists)
check "GET /api/subscriptions lists seeded sub" \
  "curl -fsS $BASE/api/subscriptions" \
  '"typePattern":"order.*"'

# 6. GET /api/dead-letter (empty array ok)
check "GET /api/dead-letter returns array" \
  "curl -fsS $BASE/api/dead-letter" \
  '"count"'

# 7. GET /api/stats
check "GET /api/stats has delivery stats" \
  "curl -fsS $BASE/api/stats" \
  '"delivery"'

# 8. POST /api/events (publish)
check "POST /api/events publishes and returns id" \
  "curl -fsS -X POST -H 'Content-Type: application/json' -H \"$AUTH_HDR\" -d '{\"type\":\"smoke.test\",\"source\":\"smoke\",\"payload\":{\"hello\":\"world\"}}' $BASE/api/events" \
  '"id"'

# 9. POST /api/subscriptions (register a no-op subscriber)
check "POST /api/subscriptions registers new sub" \
  "curl -fsS -X POST -H 'Content-Type: application/json' -H \"$AUTH_HDR\" -d '{\"typePattern\":\"smoke.*\",\"webhookUrl\":\"http://localhost:4599/ok\"}' $BASE/api/subscriptions" \
  '"typePattern":"smoke.*"'

# 10. GET /api/events?type=order.created (filtered)
check "GET /api/events?type=order.created returns order events" \
  "curl -fsS '$BASE/api/events?type=order.created'" \
  'order.created'

# 11. GET /api/events?source=mock (filtered by source)
check "GET /api/events?source=mock returns mock events" \
  "curl -fsS '$BASE/api/events?source=mock'" \
  'mock'

# 12. GET /api/events?schemaVersion=1.0
check "GET /api/events?schemaVersion=1.0 returns v1 events" \
  "curl -fsS '$BASE/api/events?schemaVersion=1.0'" \
  '"schema_version":"1.0"'

# 13. GET /api/stats has events.published > 0
check "GET /api/stats shows events published" \
  "curl -fsS $BASE/api/stats" \
  '"published"'

echo
echo "----- smoke results: $PASS passed, $FAIL failed -----"
[ $FAIL -eq 0 ]
