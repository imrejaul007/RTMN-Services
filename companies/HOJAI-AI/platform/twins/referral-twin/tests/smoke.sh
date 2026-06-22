#!/bin/bash
# Referral Twin - Smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4965}"
PASS=0; FAIL=0
TMPDIR="${TMPDIR:-/tmp}"

# Check if service is up first
if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
  # Try root as fallback
  if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/" 2>/dev/null; then
    echo "  SKIP  Service not running at ${BASE_URL}"
    exit 0
  fi
fi

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-}" expect_code="${6:-}"
  local body_file="${TMPDIR}/_rtw_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  local body=$(cat "$body_file" 2>/dev/null)
  if [ -n "$expect_code" ]; then
    if [ "$expect_code" = "any" ]; then
      echo "  PASS  [$code]  $method $path  -- $label (any)"
      PASS=$((PASS+1))
    elif [[ "$expect_code" == "4xx" && "$code" -ge 400 && "$code" -lt 500 ]] || [[ "$expect_code" == "5xx" && "$code" -ge 500 && "$code" -lt 600 ]] || [ "$code" = "$expect_code" ]; then
      echo "  PASS  [$code]  $method $path  -- $label"
      PASS=$((PASS+1))
    else
      echo "  FAIL  [$code]  $method $path  -- $label (expected code $expect_code)"
      FAIL=$((FAIL+1))
    fi
  elif [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    if [ -z "$expect" ] || [[ "$body" == *"$expect"* ]]; then
      echo "  PASS  [$code]  $method $path  -- $label"
      PASS=$((PASS+1))
    else
      echo "  FAIL  [$code]  $method $path  -- $label (expected '$expect')"
      FAIL=$((FAIL+1))
    fi
  else
    echo "  FAIL  [$code]  $method $path  -- $label"
    FAIL=$((FAIL+1))
  fi
  rm -f "$body_file"
}

echo "============================================"
echo "  Referral Twin - Smoke"
echo "============================================"

run "health"             GET  "/health"                          "" "healthy"
run "service info"       GET  "/"                                "" "Referral Twin"
run "list referrals"     GET  "/api/referrals"                   "" "ref-001"
run "referral ref-001"   GET  "/api/referrals/ref-001"           "" "alice"
run "create referral"    POST "/api/referrals"                   '{"referrerId":"user-bob","referredEmail":"dave@example.com"}' "ref-"
run "update referral"    PATCH "/api/referrals/ref-002"          '{"status":"converted","referredUserId":"user-carol"}' "converted"
run "list programs"      GET  "/api/programs"                    "" "Standard"
run "create program"     POST "/api/programs"                    '{"name":"VIP Program","rewardAmount":100}' "VIP"
run "list links"         GET  "/api/links"                       "" "ALICE2026"
run "create link"        POST "/api/links"                       '{"userId":"user-bob"}' "lnk-"
run "link by code"       GET  "/api/links/ALICE2026"             "" "ALICE2026"
run "track click"        POST "/api/links/ALICE2026/click"       '{}' "clicks"
run "rewards"            GET  "/api/rewards"                     "" "totalReward"
run "leaderboard"        GET  "/api/leaderboard"                 "" "leaderboard"
run "fraud check clean"  POST "/api/fraud/check"                 '{"referrerId":"user-alice","referredEmail":"new@example.com"}' "low"
run "fraud check dup"    POST "/api/fraud/check"                 '{"referrerId":"user-alice","referredEmail":"bob@example.com"}' "high"
run "stats"              GET  "/api/stats"                       "" "referrals"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
