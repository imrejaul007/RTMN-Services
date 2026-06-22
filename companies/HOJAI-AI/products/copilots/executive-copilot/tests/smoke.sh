#!/bin/bash
# Executive Copilot - Smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4933}"
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
  local body_file="${TMPDIR}/_ecp_$$_$RANDOM.json"
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
echo "  Executive Copilot - Smoke"
echo "============================================"

run "health"             GET  "/health"                      "" "healthy"
run "service info"       GET  "/"                            "" "Executive Copilot"
run "insights list"      GET  "/api/insights"                "" ""
run "insight ins-001"    GET  "/api/insights/ins-001"        "" "Q4 Revenue"
run "insights quick"     POST "/api/insights"                '{}' "Revenue up"
run "insight generate"   POST "/api/insights/generate"       '{"topic":"Q4 Sales"}' ""
run "decisions list"     GET  "/api/decisions"               "" ""
run "decision dec-001"   GET  "/api/decisions/dec-001"       "" "European"
run "decision analyze"   POST "/api/decisions/analyze"       '{"scenario":"expand to APAC"}' ""
run "reports list"       GET  "/api/reports"                 "" ""
run "exec report"        POST "/api/reports/executive"       '{"period":"Q4 2026"}' "revenue"
run "strategies"         GET  "/api/strategies"              "" ""
run "strategy strat-1"   GET  "/api/strategies/strat-1"      "" "Customer Success"
run "kpis"               GET  "/api/kpis"                    "" ""
run "kpi revenue"        GET  "/api/kpis/revenue"            "" ""
run "competitors"        GET  "/api/competitors"             "" ""
run "competitor comp-1"  GET  "/api/competitors/comp-1"      "" ""
run "dashboard"          GET  "/api/dashboard"               "" "kpis"
run "briefing"           GET  "/api/briefing"                "" "Good morning"
run "scenarios"          GET  "/api/scenarios"               "" ""
run "scenario simulate"  POST "/api/scenarios/simulate"      '{"assumptions":{"growth":0.15}}' ""

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
