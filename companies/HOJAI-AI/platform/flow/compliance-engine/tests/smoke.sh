#!/bin/bash
# Compliance Engine - Smoke Tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4261}"
LOG="${LOG:-/tmp/compliance-engine.log}"
SERVICE_TOKEN=$(grep "Service token" "$LOG" 2>/dev/null | head -1 | awk '{print $NF}')
if [ -z "$SERVICE_TOKEN" ]; then
  echo "FATAL: cannot find service token in $LOG — start: PORT=4261 node src/index.js > $LOG 2>&1 &"
  exit 1
fi
AUTH=( -H "X-Service-Token: $SERVICE_TOKEN" )
PASS=0; FAIL=0; TOTAL=0

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-200}"
  local body="/tmp/_ce_$$.json"
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

echo "============================================"
echo "  Compliance Engine - Smoke Tests"
echo "  Target: $BASE_URL"
echo "============================================"

run "health"                GET  "/health" "" "200"
run "frameworks"            GET  "/api/frameworks" "" "200"
run "framework controls"    GET  "/api/frameworks/gdpr/controls" "" "200"
run "control by id"         GET  "/api/controls/gdpr.art32" "" "200"
run "unknown framework 404" GET  "/api/frameworks/nope/controls" "" "404"
run "unknown control 404"   GET  "/api/controls/nope" "" "404"

# Create a policy mapping
POL=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"encryption-at-rest","controlIds":["gdpr.art32","soc2.cc6","iso.a8"]}' \
  "${BASE_URL}/api/policies")
POLICY_ID=$(echo "$POL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "  -> mapped policy $POLICY_ID"

run "list policies"         GET  "/api/policies" "" "200"
run "get policy"            GET  "/api/policies/$POLICY_ID" "" "200"

# Bad control id should 400
run "bad control 400"       POST "/api/policies" '{"name":"x","controlIds":["does.not.exist"]}' "400"

# Evidence
run "add evidence"          POST "/api/evidence" '{"controlId":"gdpr.art32","kind":"config","summary":"AES-256 enabled on all DBs","source":"aws-config"}' "200"
run "list evidence"         GET  "/api/evidence?controlId=gdpr.art32" "" "200"

# Attestation
ATT=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"controlId":"gdpr.art32","attestedBy":"ciso@example.com","validUntil":"2026-12-31T00:00:00Z"}' \
  "${BASE_URL}/api/attestations")
ATT_ID=$(echo "$ATT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
run "list attestations"     GET  "/api/attestations" "" "200"
run "revoke attestation"    POST "/api/attestations/$ATT_ID/revoke" "" "200"

# Coverage
run "coverage gdpr"         GET  "/api/coverage?framework=gdpr" "" "200"
run "coverage all"          GET  "/api/coverage" "" "200"

# Snapshot
run "snapshot gdpr"         GET  "/api/frameworks/gdpr/snapshot" "" "200"

# Audit
run "audit"                 GET  "/api/audit?type=policy.mapped" "" "200"

# Cleanup
run "delete policy"         DELETE "/api/policies/$POLICY_ID" "" "200"

echo ""
echo "============================================"
echo "  Result: $PASS / $TOTAL passed, $FAIL failed"
echo "============================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
