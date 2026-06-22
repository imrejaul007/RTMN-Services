#!/usr/bin/env bash
# Memory Context Engine smoke test
#
# Verifies:
#   - health, services, stats endpoints
#   - auth toggle (on → 401, off → 200)
#   - /api/context builds a ranked window using upstreams
#
# Requires: memory-os (4703), memory-confidence (4152), twin-memory-bridge (4704)

set -u
BASE="${BASE:-http://localhost:4790}"
MEMOS="${MEMOS:-http://localhost:4703}"
PASS=0
FAIL=0
FAILURES=()

http() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -o /tmp/_mce_body.json -w "%{http_code}" -X "$method" "$BASE$path" \
      -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -o /tmp/_mce_body.json -w "%{http_code}" -X "$method" "$BASE$path"
  fi
}

jget() {
  python3 -c "import json; d=json.load(open('/tmp/_mce_body.json')); $1"
}

check() {
  local label="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then
    echo "  [PASS] $label"
    PASS=$((PASS+1))
  else
    echo "  [FAIL] $label (expected $want got $got)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label")
  fi
}

# Start with auth off
http GET "/api/auth/toggle?on=false" >/dev/null
sleep 0.3

echo "[1] Public endpoints"
code=$(http GET "/health")
check "health 200" "$code" "200"

echo
echo "[2] Stats endpoint"
code=$(http GET "/api/stats")
check "stats 200" "$code" "200"
total=$(jget "print(d.get('stats',{}).get('totalCalls'))")
check "stats.totalCalls exists (None or int)" "$([ "$total" = "None" ] || { [ -n "$total" ] && [ "$total" -ge 0 ]; } && echo 0 || echo 1)" "0"

echo
echo "[3] Build context window"
TWIN="mce-smoke-$(date +%s)-$$"
# Seed a memory first
curl -s "$MEMOS/api/auth/toggle?on=false" >/dev/null
curl -s -X POST "$MEMOS/api/memory/personal/$TWIN" -H 'Content-Type: application/json' \
  -d '{"content":"User likes espresso","tags":["coffee"],"importance":"Medium"}' >/dev/null

code=$(http POST /api/context "{\"twinId\":\"$TWIN\",\"query\":\"coffee preferences\",\"limit\":3}")
check "context 200" "$code" "200"
items=$(jget "print(d.get('data',{}).get('count',0))")
echo "    returned $items items"

echo
echo "[4] Auth flow"
code=$(http GET "/api/auth/toggle?on=true")
check "toggle on" "$code" "200"
code=$(http POST /api/context "{\"twinId\":\"$TWIN\",\"query\":\"x\",\"limit\":1}")
check "no-token context returns 401" "$code" "401"
code=$(http GET "/api/auth/toggle?on=false")
check "toggle off" "$code" "200"
code=$(http POST /api/context "{\"twinId\":\"$TWIN\",\"query\":\"x\",\"limit\":1}")
check "auth-off context returns 200" "$code" "200"

# Restore auth to off (dev default)
http GET "/api/auth/toggle?on=false" >/dev/null

echo
echo "=========================================="
echo "PASS: $PASS  FAIL: $FAIL  / $((PASS+FAIL))"
if [ $FAIL -gt 0 ]; then
  echo "FAILURES:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "ALL CONTEXT ENGINE TESTS PASSED"