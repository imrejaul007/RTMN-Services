#!/usr/bin/env bash
# tests/e2e.sh — full Event Bus workflow
# Usage: bash tests/e2e.sh [PORT]   default 4510
set -u

PORT="${1:-4510}"
BASE="http://localhost:${PORT}"
MOCK_PORT=4599
MOCK_BASE="http://localhost:${MOCK_PORT}"
MOCK_OUT="/tmp/_eb_received.json"
PASS=0
FAIL=0

# Phase 2 (ADR-0009): the service uses @rtmn/shared/auth `requireAuth` on
# all write endpoints. Mint a base64 token via the same `createToken` helper
# so the test is self-contained and doesn't need a live CorpID.
SMOKE_TOKEN="$(node -e 'const t=Buffer.from(JSON.stringify({sub:"smoke-test",role:"owner",iat:Date.now(),exp:Date.now()+3600000})).toString("base64");console.log(t)')"
AUTH_HDR="Authorization: Bearer ${SMOKE_TOKEN}"

# Reset mock receiver log
echo '[]' > "$MOCK_OUT"

# ----- helpers -----
# py_json <body> '<python expression over d>'  OR
# cat body | py_json '<python expression over d>'
# Reads JSON body and evaluates a Python expression against the parsed dict.
# Writes body to a temp file to avoid shell escaping issues with `$` and quotes.
py_json() {
  local body expr tmpfile
  if [ "$#" -ge 2 ]; then
    body="$1"
    expr="$2"
  else
    body="$(cat)"
    expr="$1"
  fi
  tmpfile=$(mktemp /tmp/_eb_py.XXXXXX.json)
  printf '%s' "$body" > "$tmpfile"
  PY_BODY_FILE="$tmpfile" PY_EXPR="$expr" python3 <<'PYEOF'
import json, os
d = json.load(open(os.environ['PY_BODY_FILE']))
print(eval(os.environ['PY_EXPR']))
PYEOF
  rm -f "$tmpfile"
}

# py_load <file> '<python expression over d>'
py_load() {
  local file="$1"
  local expr="$2"
  PY_BODY_FILE="$file" PY_EXPR="$expr" python3 <<'PYEOF'
import json, os
d = json.load(open(os.environ['PY_BODY_FILE']))
print(eval(os.environ['PY_EXPR']))
PYEOF
}

py_dump() {
  python3 -c "import json,sys
print(json.dumps($1))" > "$2"
}

post() {
  curl -fsS -X POST -H 'Content-Type: application/json' -H "$AUTH_HDR" -d "$1" "$2"
}

patch_() {
  curl -fsS -X PATCH -H 'Content-Type: application/json' -H "$AUTH_HDR" -d "$1" "$2"
}

delete_() {
  curl -fsS -X DELETE -H "$AUTH_HDR" "$1"
}

get() {
  curl -fsS "$1"
}

check() {
  local name="$1"
  local cond="$2"
  if eval "$cond" >/dev/null 2>&1; then
    PASS=$((PASS + 1))
    printf "  \033[32mOK\033[0m   %s\n" "$name"
  else
    FAIL=$((FAIL + 1))
    printf "  \033[31mFAIL\033[0m %s\n" "$name"
    printf "       condition: %s\n" "$cond"
  fi
}

# Helper for substring / pattern assertions where the value is in $1 and the
# expected substring (literal) is in $2. Works regardless of the outer shell.
check_substr() {
  local name="$1"
  local value="$2"
  local expected="$3"
  if [[ "$value" == *"$expected"* ]]; then
    PASS=$((PASS + 1))
    printf "  \033[32mOK\033[0m   %s\n" "$name"
  else
    FAIL=$((FAIL + 1))
    printf "  \033[31mFAIL\033[0m %s\n" "$name"
    printf "       expected: %s\n" "$expected"
    printf "       got:      %s\n" "$value"
  fi
}

# Reset mock receiver state via the in-process endpoint
reset_mock() {
  curl -fsS -X POST "$MOCK_BASE/_reset" > /dev/null
}

# Wait until mock has at least N requests, max 20s
wait_for_count() {
  local n="$1"
  local i=0
  while [ $i -lt 40 ]; do
    local c
    c=$(curl -fsS "$MOCK_BASE/_count" 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin)["count"])' 2>/dev/null || echo 0)
    if [ "$c" -ge "$n" ] 2>/dev/null; then
      return 0
    fi
    sleep 0.5
    i=$((i + 1))
  done
  return 1
}

echo "Event Bus e2e against $BASE (mock receiver $MOCK_BASE)"
echo

# ============================================================
# Setup: clean state and confirm baseline
# ============================================================
echo "Setup..."
HEALTH=$(get "$BASE/health")
check_substr "service is up" "$HEALTH" '"status":"ok"'

# Phase 2 cleanup: wipe accumulated state from prior runs so the test
# runs in isolation.
#
# Order matters: replay DLQ entries FIRST (they still reference the
# subscriptions), then delete the subscriptions themselves. Otherwise
# the replay handler returns 404 when the sub is already gone and the
# DLQ entry sticks around, polluting later counts.
ALL_DLQ=$(get "$BASE/api/dead-letter")
echo "$ALL_DLQ" | python3 -c '
import json,sys
entries = json.load(sys.stdin)["entries"]
for e in entries: print(e["id"])' | while read id; do
  post '' "$BASE/api/dead-letter/$id/replay" > /dev/null 2>&1 || true
done
ALL_SUBS=$(get "$BASE/api/subscriptions")
echo "$ALL_SUBS" | python3 -c '
import json,sys
subs = json.load(sys.stdin)["subscriptions"]
for s in subs: print(s["id"])' | while read id; do
  delete_ "$BASE/api/subscriptions/$id" > /dev/null 2>&1 || true
done
SEED_SUB_ID=""
if [ -n "$SEED_SUB_ID" ]; then
  delete_ "$BASE/api/subscriptions/$SEED_SUB_ID" > /dev/null
  echo "  removed seed subscription: $SEED_SUB_ID"
fi

# Count of seed events (5)
SEED_COUNT=$(get "$BASE/api/events" | python3 -c 'import json,sys;print(json.load(sys.stdin)["count"])')
check "seed events present (>= 5)" "[ \"$SEED_COUNT\" -ge 5 ]"

# ============================================================
# Step 1: Publish a test event (matched by mock receiver subscriber we register later)
# Actually we'll register subscriber first then publish — order doesn't matter
# ============================================================
echo
echo "Step 1-3: register subscriber, publish matching event, expect delivery"

reset_mock
SUB_BODY='{"typePattern":"e2e.test.*","webhookUrl":"http://localhost:4599/ok"}'
SUB_RESP=$(post "$SUB_BODY" "$BASE/api/subscriptions")
SUB_ID=$(echo "$SUB_RESP" | py_json 'd["id"]')
check "subscription registered" "[ -n \"\$SUB_ID\" ]"

PUB_BODY='{"type":"e2e.test.created","source":"e2e","payload":{"e2e":true,"step":1}}'
PUB_RESP=$(post "$PUB_BODY" "$BASE/api/events")
EV_ID=$(echo "$PUB_RESP" | py_json 'd["id"]')
check "event published" "[ -n \"\$EV_ID\" ]"

# Wait for delivery
wait_for_count 1
RC=$?
check "mock receiver got 1 delivery within timeout" "[ $RC -eq 0 ]"

# Verify content
LAST_TYPE=$(py_load "$MOCK_OUT" 'd[-1]["body_json"]["type"]' 2>/dev/null || echo "")
check "delivered event type matches" "[[ \"$LAST_TYPE\" == \"e2e.test.created\" ]]"

# Verify signature header present
SIG=$(py_load "$MOCK_OUT" 'd[-1]["headers"].get("X-Event-Bus-Signature","")')
check "delivery has X-Event-Bus-Signature header" "[[ \"$SIG\" == sha256=* ]]"

# Verify stats: deliveries should have incremented
STATS=$(get "$BASE/api/stats")
DELIVERED=$(echo "$STATS" | python3 -c 'import json,sys;print(json.load(sys.stdin)["events"]["delivered"])')
check "stats: eventsDelivered >= 1" "[ \"$DELIVERED\" -ge 1 ]"

# ============================================================
# Step 4: Publish event with NON-matching type -> no delivery
# ============================================================
echo
echo "Step 4: non-matching type produces no delivery"
BEFORE=$(curl -fsS "$MOCK_BASE/_count" | py_json 'd["count"]')
post '{"type":"unrelated.thing","source":"e2e","payload":{}}' "$BASE/api/events" > /dev/null
sleep 1
AFTER=$(curl -fsS "$MOCK_BASE/_count" | py_json 'd["count"]')
check "non-matching event did NOT trigger delivery" "[ \"$BEFORE\" = \"$AFTER\" ]"

# ============================================================
# Step 5: Publish event matching order.* -> delivered
# ============================================================
echo
echo "Step 5: order.* pattern matches order.created"
reset_mock
# Register a mock-bound subscriber for order.* so the publish delivers to our mock receiver
post '{"typePattern":"order.*","webhookUrl":"http://localhost:4599/ok"}' "$BASE/api/subscriptions" > /dev/null
post '{"type":"order.created","source":"e2e","payload":{"orderId":"o-e2e-1"}}' "$BASE/api/events" > /dev/null
wait_for_count 1
check "order.created delivered to mock" "[ $? -eq 0 ]"
LAST=$(py_load "$MOCK_OUT" 'd[-1]["body_json"]["type"]')
check "delivery type is order.created" "[[ \"$LAST\" == \"order.created\" ]]"

# Also *.created should match order.created
echo
echo "Step 5b: *.created pattern also matches order.created"
reset_mock
SUB2=$(post '{"typePattern":"*.created","webhookUrl":"http://localhost:4599/ok"}' "$BASE/api/subscriptions" | py_json 'd["id"]')
post '{"type":"order.created","source":"e2e","payload":{}}' "$BASE/api/events" > /dev/null
post '{"type":"user.created","source":"e2e","payload":{}}' "$BASE/api/events" > /dev/null
wait_for_count 2
check "*.created subscriber received 2 events (order + user)" "[ $? -eq 0 ]"

# ============================================================
# Step 6: bad webhook URL -> DLQ after maxAttempts
# ============================================================
echo
echo "Step 6: bad webhook -> DLQ after retries"
reset_mock
DLQ_BEFORE=$(get "$BASE/api/dead-letter" | python3 -c 'import json,sys;print(json.load(sys.stdin)["count"])')
# /fail-3x fails first 3 attempts then succeeds -> still ends in DLQ because maxAttempts=3 and 3rd succeeds
# Use /fail which always returns 500 to force DLQ
BAD_SUB=$(post '{"typePattern":"e2e.fail.*","webhookUrl":"http://localhost:4599/fail","retryPolicy":{"maxAttempts":3,"backoffMs":200,"backoffMultiplier":2}}' "$BASE/api/subscriptions" | py_json 'd["id"]')
post '{"type":"e2e.fail.now","source":"e2e","payload":{}}' "$BASE/api/events" > /dev/null
# Wait: 1st attempt immediate, 2nd after 200ms, 3rd after 400ms = ~700ms total + slack
sleep 4
DLQ_AFTER=$(get "$BASE/api/dead-letter" | python3 -c 'import json,sys;print(json.load(sys.stdin)["count"])')
check "DLQ size increased" "[ \"$DLQ_AFTER\" -gt \"$DLQ_BEFORE\" ]"
# Verify DLQ contains our event
DLQ_LIST=$(get "$BASE/api/dead-letter")
DLQ_HAS_EVT=$(echo "$DLQ_LIST" | python3 -c "
import json,sys
d = json.load(sys.stdin)
hits = [e for e in d['entries'] if e['event']['type'] == 'e2e.fail.now']
print(len(hits))
")
check "DLQ contains e2e.fail.now event" "[ \"$DLQ_HAS_EVT\" -ge 1 ]"

# ============================================================
# Step 7: Replay DLQ -> moves back to active (we point sub at /ok first via PATCH)
# ============================================================
echo
echo "Step 7: replay DLQ event after fixing webhook"
# Patch the bad sub to use /ok so the replayed event actually succeeds
patch_ '{"webhookUrl":"http://localhost:4599/ok"}' "$BASE/api/subscriptions/$BAD_SUB" > /dev/null
reset_mock
DLQ_ID=$(echo "$DLQ_LIST" | python3 -c "
import json,sys
d = json.load(sys.stdin)
for e in d['entries']:
  if e['event']['type'] == 'e2e.fail.now':
    print(e['id']); break
")
check "have DLQ id for replay" "[ -n \"$DLQ_ID\" ]"
post '' "$BASE/api/dead-letter/$DLQ_ID/replay" > /dev/null
wait_for_count 1
check "DLQ replay delivered to (now-fixed) webhook" "[ $? -eq 0 ]"

# ============================================================
# Step 8: Replay specific event by id -> redelivered
# ============================================================
echo
echo "Step 8: replay specific event by id"
reset_mock
post '' "$BASE/api/events/replay/$EV_ID" > /dev/null
wait_for_count 1
check "replay-by-id re-delivered event" "[ $? -eq 0 ]"
REPLAYED_ID=$(py_load "$MOCK_OUT" 'd[-1]["body_json"]["id"]')
check "replayed event has same id as published" "[[ \"$REPLAYED_ID\" == \"$EV_ID\" ]]"

# ============================================================
# Step 9: Subscribe with payload filter
# ============================================================
echo
echo "Step 9: payload filter restricts delivery"
reset_mock
# Phase 2 cleanup: remove every pre-existing subscription so the test
# runs in isolation.
ALL_SUBS=$(get "$BASE/api/subscriptions")
echo "$ALL_SUBS" | python3 -c '
import json,sys
subs = json.load(sys.stdin)["subscriptions"]
for s in subs: print(s["id"])' | while read id; do
  delete_ "$BASE/api/subscriptions/$id" > /dev/null 2>&1 || true
done
# Subscriber wants only tenant=t-1
FILTER_SUB=$(post '{"typePattern":"*","webhookUrl":"http://localhost:4599/ok","filter":{"payload.tenantId":"t-1"}}' "$BASE/api/subscriptions" | py_json 'd["id"]')
post '{"type":"anything","source":"e2e","payload":{"tenantId":"t-2"}}' "$BASE/api/events" > /dev/null
post '{"type":"anything","source":"e2e","payload":{"tenantId":"t-1"}}' "$BASE/api/events" > /dev/null
sleep 1
COUNT_AFTER_FILTER=$(curl -fsS "$MOCK_BASE/_count" | py_json 'd["count"]')
check "filter sub got exactly 1 event (not 2)" "[ \"$COUNT_AFTER_FILTER\" = \"1\" ]"
LAST_TENANT=$(py_load "$MOCK_OUT" 'd[-1]["body_json"]["payload"]["tenantId"]')
check "delivered payload has tenantId=t-1" "[[ \"$LAST_TENANT\" == \"t-1\" ]]"

# ============================================================
# Step 10: Schema versioning
# ============================================================
echo
echo "Step 10: schema versioning"
reset_mock
# Subscriber accepts 1.0+, publish v1.0 -> delivered
SCH_SUB=$(post '{"typePattern":"schema.test","webhookUrl":"http://localhost:4599/ok","schemaVersion":"1.0+"}' "$BASE/api/subscriptions" | py_json 'd["id"]')
post '{"type":"schema.test","source":"e2e","payload":{},"schema_version":"1.0"}' "$BASE/api/events" > /dev/null
sleep 1
GOT_V1=$(curl -fsS "$MOCK_BASE/_count" | py_json 'd["count"]')
check "v1.0 event delivered to 1.0+ subscriber" "[ \"$GOT_V1\" -ge 1 ]"

# Publish v2.0 -> still delivered (>=1.0)
post '{"type":"schema.test","source":"e2e","payload":{},"schema_version":"2.0"}' "$BASE/api/events" > /dev/null
sleep 1
GOT_V2=$(curl -fsS "$MOCK_BASE/_count" | py_json 'd["count"]')
check "v2.0 event delivered to 1.0+ subscriber" "[ \"$GOT_V2\" -ge 2 ]"

# Stats should reflect schema mismatches when versions don't match subscriber's expected
SCH_STRICT=$(post '{"typePattern":"strict.match","webhookUrl":"http://localhost:4599/ok","schemaVersion":"1.0"}' "$BASE/api/subscriptions" | py_json 'd["id"]')
MISMATCH_BEFORE=$(get "$BASE/api/stats" | py_json 'd["schemaMismatches"]')
post '{"type":"strict.match","source":"e2e","payload":{},"schema_version":"2.5"}' "$BASE/api/events" > /dev/null
sleep 1
MISMATCH_AFTER=$(get "$BASE/api/stats" | py_json 'd["schemaMismatches"]')
check "schema mismatch counter increased" "[ \"$MISMATCH_AFTER\" -gt \"$MISMATCH_BEFORE\" ]"

# ============================================================
# Step 11: Subscription type pattern *.created matches order.created and user.created
# ============================================================
echo
echo "Step 11: *.created matches order.created AND user.created"
reset_mock
# Use a unique mock path so we can isolate this sub's deliveries from earlier subs.
WILDCARD=$(post '{"typePattern":"*.created","webhookUrl":"http://localhost:4599/step11"}' "$BASE/api/subscriptions" | py_json 'd["id"]')
post '{"type":"order.created","source":"e2e","payload":{}}' "$BASE/api/events" > /dev/null
post '{"type":"user.created","source":"e2e","payload":{}}' "$BASE/api/events" > /dev/null
post '{"type":"payment.completed","source":"e2e","payload":{}}' "$BASE/api/events" > /dev/null  # should NOT match
sleep 1
# Count only requests to /step11 (this sub's webhook)
STEP11_COUNT=$(py_load "$MOCK_OUT" 'sum(1 for it in d if it["path"] == "/step11")')
check "*.created got exactly 2 events at /step11 (not payment.completed)" "[ \"$STEP11_COUNT\" = \"2\" ]"
TYPES_DELIVERED=$(py_load "$MOCK_OUT" '[sorted({it["body_json"]["type"] for it in d if it["path"] == "/step11"})]')
echo "    types delivered to /step11: $TYPES_DELIVERED"

# ============================================================
# Step 12: GET /api/subscriptions/:id and PATCH/DELETE
# ============================================================
echo
echo "Step 12: subscription CRUD"
GOT=$(get "$BASE/api/subscriptions/$WILDCARD")
check_substr "GET single subscription" "$GOT" '"typePattern":"*.created"'
patch_ '{"active":false}' "$BASE/api/subscriptions/$WILDCARD" > /dev/null
PATCHED=$(get "$BASE/api/subscriptions/$WILDCARD")
check_substr "PATCH toggled active to false" "$PATCHED" '"active":false'
delete_ "$BASE/api/subscriptions/$WILDCARD" > /dev/null
# Subsequent GET should 404; allow curl to fail and capture stderr/stdout
DELETED=$(curl -sS "$BASE/api/subscriptions/$WILDCARD" 2>&1 || true)
check_substr "DELETE returns not-found on subsequent GET" "$DELETED" 'not found'

# ============================================================
# Final stats snapshot
# ============================================================
echo
echo "Final stats:"
get "$BASE/api/stats" | python3 -m json.tool | sed 's/^/    /'

echo
echo "----- e2e results: $PASS passed, $FAIL failed -----"
[ $FAIL -eq 0 ]
