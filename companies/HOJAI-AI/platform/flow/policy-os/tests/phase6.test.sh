#!/bin/bash
# PolicyOS - Phase 6 Tests (validation + composition + time-bounds + bulk)
set -u
BASE_URL="${BASE_URL:-http://localhost:4254}"
LOG="${LOG:-/tmp/policy-os-phase4.log}"
SERVICE_TOKEN=$(grep "Service token" "$LOG" 2>/dev/null | head -1 | awk '{print $NF}')
if [ -z "$SERVICE_TOKEN" ]; then
  echo "FATAL: cannot find service token in $LOG"
  exit 1
fi
AUTH=( -H "X-Service-Token: $SERVICE_TOKEN" )
PASS=0; FAIL=0; TOTAL=0

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-200}"
  local body="/tmp/_p6_$$.json"
  TOTAL=$((TOTAL+1))
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body" -w "%{http_code}" -X "$method" "${AUTH[@]}" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body" -w "%{http_code}" -X "$method" "${AUTH[@]}" "${BASE_URL}${path}")
  fi
  if [ "$code" = "$expect" ]; then
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  [$code]  $method $path  -- $label (expected $expect)"
    echo "        body: $(head -c 300 "$body")"
    FAIL=$((FAIL+1))
  fi
}

assert_json() {
  local label="$1" jq_path="$2" expect="$3" body_file="$4"
  TOTAL=$((TOTAL+1))
  local actual=$(python3 -c "
import json
try:
  d = json.load(open('$body_file'))
  v = d
  for p in '$jq_path'.split('.'):
    if p.startswith('[') and p.endswith(']'):
      v = v[int(p[1:-1])]
    else:
      v = v.get(p) if isinstance(v, dict) else None
  print(v)
except Exception as e:
  print(f'ERR: {e}')
")
  if [ "$actual" = "$expect" ]; then
    echo "  PASS  $label: $jq_path == $expect"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $label: $jq_path == $expect (got '$actual')"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  PolicyOS - Phase 6 Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# --- Schema validation ---
echo ""
echo "[ Schema Validation ]"

# Validate endpoint
run "validate good policy" POST "/api/policies/validate" '{"name":"x","category":"security","rules":[{"if":{},"then":{"allow":true}}]}' "200"

# bad category
run "validate bad category" POST "/api/policies/validate" '{"name":"x","category":"unknown-cat","rules":[]}' "400"

# bad rule shape
run "validate bad rule" POST "/api/policies/validate" '{"name":"x","category":"security","rules":[{"then":{"allow":true}}]}' "400"

# bad effectiveFrom
run "validate bad effectiveFrom" POST "/api/policies/validate" '{"name":"x","category":"security","rules":[],"effectiveFrom":"not-a-date"}' "400"

# effectiveFrom > effectiveUntil
run "validate inverted bounds" POST "/api/policies/validate" '{"name":"x","category":"security","rules":[],"effectiveFrom":"2030-01-01T00:00:00.000Z","effectiveUntil":"2020-01-01T00:00:00.000Z"}' "400"

# bad composition
run "validate bad composition mode" POST "/api/policies/validate" '{"name":"x","category":"security","rules":[],"composition":{"mode":"nope","policyIds":[]}}' "400"

# --- Time-bounded policy enforcement ---
echo ""
echo "[ Time-bounded Policy Enforcement ]"

# Create a future-effective policy (effective in the year 3000)
FUTURE=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"phase6-future","category":"security","status":"published","rules":[{"if":{},"then":{"allow":true}}],"effectiveFrom":"3025-01-01T00:00:00.000Z"}' \
  "${BASE_URL}/api/policies")
FID=$(echo "$FUTURE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "  -> created future policy $FID"

# Evaluate by id: should be DENIED with "not yet effective"
EV=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"policyId\":\"$FID\",\"context\":{\"action\":\"test\"}}" \
  "${BASE_URL}/api/policies/evaluate")
echo "        $EV" | head -c 200
ALLOWED=$(echo "$EV" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
REASON=$(echo "$EV" | python3 -c "import sys,json; r=json.load(sys.stdin).get('reasons',[]); print(' | '.join(r))")
if [ "$ALLOWED" = "False" ] && echo "$REASON" | grep -q "not yet effective"; then
  echo "  PASS  future-dated policy denied (fail-closed)"
  PASS=$((PASS+1))
else
  echo "  FAIL  future-dated policy should be denied (got allowed=$ALLOWED, reason='$REASON')"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# Create an expired policy (effectiveUntil in the past)
EXPIRED=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"phase6-expired","category":"security","status":"published","rules":[{"if":{},"then":{"allow":true}}],"effectiveUntil":"2020-01-01T00:00:00.000Z"}' \
  "${BASE_URL}/api/policies")
EID=$(echo "$EXPIRED" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "  -> created expired policy $EID"

EV2=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"policyId\":\"$EID\",\"context\":{\"action\":\"test\"}}" \
  "${BASE_URL}/api/policies/evaluate")
ALLOWED2=$(echo "$EV2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
REASON2=$(echo "$EV2" | python3 -c "import sys,json; r=json.load(sys.stdin).get('reasons',[]); print(' | '.join(r))")
if [ "$ALLOWED2" = "False" ] && echo "$REASON2" | grep -q "expired"; then
  echo "  PASS  expired policy denied (fail-closed)"
  PASS=$((PASS+1))
else
  echo "  FAIL  expired policy should be denied (got allowed=$ALLOWED2, reason='$REASON2')"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# --- Bulk operations ---
echo ""
echo "[ Bulk Operations ]"

BULK=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"policies":[
    {"name":"bulk-a","category":"security","status":"draft","rules":[]},
    {"name":"bulk-b","category":"privacy","status":"draft","rules":[]},
    {"name":"x","category":"unknown","rules":[]}
  ]}' \
  "${BASE_URL}/api/policies/bulk")
echo "        $(echo $BULK | head -c 200)"
CREATED=$(echo "$BULK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('created',0))")
FAILED=$(echo "$BULK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('failed',0))")
if [ "$CREATED" = "2" ] && [ "$FAILED" = "1" ]; then
  echo "  PASS  bulk: 2 created, 1 failed"
  PASS=$((PASS+1))
else
  echo "  FAIL  bulk: expected 2/1, got $CREATED/$FAILED"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# bulk-publish
BULK_IDS=$(echo "$BULK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(p['id'] for p in d['policies']))")
PUBLISH=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"policyIds\":[\"${BULK_IDS//,/\",\"}\"]}" \
  "${BASE_URL}/api/policies/bulk-publish")
echo "        $PUBLISH" | head -c 200
PUBCOUNT=$(echo "$PUBLISH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for r in d.get('results',[]) if r.get('status')=='published'))")
if [ "$PUBCOUNT" = "2" ]; then
  echo "  PASS  bulk-publish: 2 published"
  PASS=$((PASS+1))
else
  echo "  FAIL  bulk-publish expected 2, got $PUBCOUNT"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# --- Composition ---
echo ""
echo "[ Policy Composition ]"

# Need real policies to compose. Create 2: one always-allow, one always-deny (fail-closed)
ALLOW_P=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"phase6-allow","category":"security","status":"published","rules":[{"if":{},"then":{"allow":true}}]}' \
  "${BASE_URL}/api/policies")
AID=$(echo "$ALLOW_P" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# anyOf: at least one allows => should be allowed
COMP_ANY=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"composition\":{\"mode\":\"anyOf\",\"policyIds\":[\"$FID\",\"$AID\"]},\"context\":{\"action\":\"x\"}}" \
  "${BASE_URL}/api/composition-evaluate")
ANY_ALLOWED=$(echo "$COMP_ANY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
if [ "$ANY_ALLOWED" = "True" ]; then
  echo "  PASS  composition anyOf: 1 allow + 1 not-yet-effective = allowed"
  PASS=$((PASS+1))
else
  echo "  FAIL  composition anyOf should be allowed (got $ANY_ALLOWED)"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# allOf: future-effective + allow = DENIED (because future is not allowed)
COMP_ALL=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"composition\":{\"mode\":\"allOf\",\"policyIds\":[\"$FID\",\"$AID\"]},\"context\":{\"action\":\"x\"}}" \
  "${BASE_URL}/api/composition-evaluate")
ALL_ALLOWED=$(echo "$COMP_ALL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
if [ "$ALL_ALLOWED" = "False" ]; then
  echo "  PASS  composition allOf: 1 deny = denied"
  PASS=$((PASS+1))
else
  echo "  FAIL  composition allOf should be denied (got $ALL_ALLOWED)"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# majority: 1 allow + 1 deny (0.5) = allowed (threshold 0.5)
COMP_MAJ=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"composition\":{\"mode\":\"majority\",\"threshold\":0.5,\"policyIds\":[\"$FID\",\"$AID\"]},\"context\":{\"action\":\"x\"}}" \
  "${BASE_URL}/api/composition-evaluate")
MAJ_ALLOWED=$(echo "$COMP_MAJ" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
if [ "$MAJ_ALLOWED" = "True" ]; then
  echo "  PASS  composition majority 0.5: 1/2 = allowed"
  PASS=$((PASS+1))
else
  echo "  FAIL  composition majority should be allowed (got $MAJ_ALLOWED)"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# majority with threshold 0.6: should be denied (only 50% < 60%)
COMP_MAJ2=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"composition\":{\"mode\":\"majority\",\"threshold\":0.6,\"policyIds\":[\"$FID\",\"$AID\"]},\"context\":{\"action\":\"x\"}}" \
  "${BASE_URL}/api/composition-evaluate")
MAJ2_ALLOWED=$(echo "$COMP_MAJ2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
if [ "$MAJ2_ALLOWED" = "False" ]; then
  echo "  PASS  composition majority 0.6: 1/2 = denied"
  PASS=$((PASS+1))
else
  echo "  FAIL  composition majority 0.6 should be denied (got $MAJ2_ALLOWED)"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# --- Cleanup ---
echo ""
echo "[ Cleanup ]"
for id in $FID $EID $AID $(echo "$BULK_IDS" | tr ',' ' '); do
  curl -s -X DELETE "${AUTH[@]}" "${BASE_URL}/api/policies/${id}?hard=true" > /dev/null
done
echo "  cleanup done"

echo ""
echo "============================================"
echo "  Result: $PASS / $TOTAL passed, $FAIL failed"
echo "============================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
