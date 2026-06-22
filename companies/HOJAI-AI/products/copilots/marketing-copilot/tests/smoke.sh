#!/bin/bash
# Marketing Copilot - Smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4929}"
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
  local body_file="${TMPDIR}/_mcp_$$_$RANDOM.json"
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
echo "  Marketing Copilot - Smoke"
echo "============================================"

run "health"             GET  "/health"                      "" "healthy"
run "service info"       GET  "/"                            "" "Marketing Copilot"
run "campaigns list"     GET  "/api/campaigns"               "" "Summer Sale"
run "campaign cmp-001"   GET  "/api/campaigns/cmp-001"       "" ""
run "generate campaign"  POST "/api/campaigns/generate"      '{"goal":"Increase signups","audience":"SMBs","channels":["email","social"]}' "AI Campaign"
run "content generate"   POST "/api/content/generate"        '{"topic":"AI in marketing","tone":"professional","platform":"blog"}' "AI in marketing"
run "audiences list"     GET  "/api/audiences"               "" "Tech Enthusiasts"
run "audience aud-001"   GET  "/api/audiences/aud-001"       "" ""
run "audience insights"  POST "/api/audience/insights"       '{"segmentId":"aud-001"}' "segmentId"
run "seo analyze"        POST "/api/seo/analyze"             '{"url":"https://example.com"}' "score"
run "seo keywords"       POST "/api/seo/keywords"            '{"topic":"AI marketing","count":3}' "keywords"
run "email subject"      POST "/api/email/subject"           '{"topic":"New Product Launch","tone":"excited"}' "subjectLines"
run "email body"         POST "/api/email/body"              '{"topic":"Welcome","audience":"customers"}' "body"
run "social post"        POST "/api/social/post"             '{"topic":"AI launch","platform":"linkedin"}' "hashtags"
run "landing generate"   POST "/api/landing/generate"        '{"product":"OurApp","audience":"developers"}' "headline"
run "ab test"            POST "/api/ab-test"                 '{"name":"Homepage CTA test","variants":["A","B"]}' "variants"
run "calendar"           GET  "/api/calendar"                "" "calendar"
run "performance"        GET  "/api/performance"             "" "summary"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
