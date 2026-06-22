#!/bin/bash
# Consent Engine - Smoke Tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4262}"
LOG="${LOG:-/tmp/consent-engine.log}"
SERVICE_TOKEN=$(grep "Service token" "$LOG" 2>/dev/null | head -1 | awk '{print $NF}')
if [ -z "$SERVICE_TOKEN" ]; then
  echo "FATAL: cannot find service token in $LOG — start: PORT=4262 node src/index.js > $LOG 2>&1 &"
  exit 1
fi
AUTH=( -H "X-Service-Token: $SERVICE_TOKEN" )
PASS=0; FAIL=0; TOTAL=0

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-200}"
  local body="/tmp/_cn_$$.json"
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
echo "  Consent Engine - Smoke Tests"
echo "  Target: $BASE_URL"
echo "============================================"

run "health"                GET  "/health" "" "200"
run "purposes"              GET  "/api/purposes" "" "200"

# The check should DENY before any consent is granted (fail-closed)
CHECK=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"subjectId":"u-alice","purpose":"marketing.email"}' \
  "${BASE_URL}/api/check")
ALLOWED=$(echo "$CHECK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
if [ "$ALLOWED" = "False" ]; then
  echo "  PASS  check denies before consent (fail-closed)"
  PASS=$((PASS+1))
else
  echo "  FAIL  check should deny before consent (got allowed=$ALLOWED)"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# Grant consent
GRANT=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"subjectId":"u-alice","purpose":"marketing.email","source":"signup-form","evidence":"checkbox-v2"}' \
  "${BASE_URL}/api/consents")
CID=$(echo "$GRANT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "  -> granted consent $CID"
run "bad grant 400"         POST "/api/consents" '{"subjectId":"x"}' "400"

# Check should now ALLOW
CHECK2=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"subjectId":"u-alice","purpose":"marketing.email"}' "${BASE_URL}/api/check")
ALLOWED2=$(echo "$CHECK2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
if [ "$ALLOWED2" = "True" ]; then
  echo "  PASS  check allows after consent"
  PASS=$((PASS+1))
else
  echo "  FAIL  check should allow after consent (got $ALLOWED2)"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

run "get consent"           GET  "/api/consents/$CID" "" "200"
run "subject consents"      GET  "/api/subjects/u-alice/consents" "" "200"
run "subject summary"       GET  "/api/subjects/u-alice/summary" "" "200"

# Withdraw single
run "withdraw consent"      POST "/api/consents/$CID/withdraw" "" "200"

# After withdraw, check should DENY again
CHECK3=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"subjectId":"u-alice","purpose":"marketing.email"}' "${BASE_URL}/api/check")
ALLOWED3=$(echo "$CHECK3" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allowed',''))")
if [ "$ALLOWED3" = "False" ]; then
  echo "  PASS  check denies after withdrawal"
  PASS=$((PASS+1))
else
  echo "  FAIL  check should deny after withdrawal (got $ALLOWED3)"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

# Bulk withdrawal: grant multiple, then withdraw-all-for-purpose
curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"subjectId":"u-bob","purpose":"analytics.cohort"}' "${BASE_URL}/api/consents" > /dev/null
curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"subjectId":"u-bob","purpose":"analytics.cohort"}' "${BASE_URL}/api/consents" > /dev/null

run "bulk withdraw"         POST "/api/consents/withdraw" '{"subjectId":"u-bob","purpose":"analytics.cohort"}' "200"

run "check missing 400"     POST "/api/check" '{"subjectId":"x"}' "400"
run "audit"                 GET  "/api/audit?subjectId=u-alice" "" "200"

echo ""
echo "============================================"
echo "  Result: $PASS / $TOTAL passed, $FAIL failed"
echo "============================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
