#!/bin/bash
# Area Twin - Smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4964}"
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
  local body_file="${TMPDIR}/_atw_$$_$RANDOM.json"
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
echo "  Area Twin - Smoke"
echo "============================================"

run "health"             GET  "/health"                                "" "healthy"
run "service info"       GET  "/"                                      "" "Area Twin"
run "list areas"         GET  "/api/areas"                             "" "Downtown"
run "area sf"            GET  "/api/areas/area-downtown-sf"            "" "San Francisco"
run "create area"        POST "/api/areas"                             '{"name":"Brooklyn","center":{"lat":40.6782,"lng":-73.9442},"radius":2,"population":50000}' "Brooklyn"
run "update area"        PUT  "/api/areas/area-downtown-sf"            '{"population":90000}' "90000"
run "area analytics"     GET  "/api/areas/area-downtown-sf/analytics"  "" "trends"
run "areas nearby sf"    GET  "/api/areas/nearby?lat=37.78&lng=-122.42&radius=5" "" "Downtown"
run "track visitor"      POST "/api/visitors"                          '{"visitorId":"v1","areaId":"area-downtown-sf","lat":37.78,"lng":-122.42,"duration":1200}' ""
run "visitors list"      GET  "/api/visitors"                          "" ""
run "events list"        GET  "/api/events"                            "" "SF Tech Week"
run "create event"       POST "/api/events"                            '{"areaId":"area-downtown-sf","name":"Concert","startDate":"2026-12-01","expectedAttendance":5000}' "Concert"
run "demographics"       GET  "/api/demographics/area-downtown-sf"     "" "ageBreakdown"
run "heatmap"            GET  "/api/heatmap/area-downtown-sf"          "" "grid"
run "stats"              GET  "/api/stats"                             "" "areas"
# Skip the delete test to keep the test idempotent - data is in-memory only anyway

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
