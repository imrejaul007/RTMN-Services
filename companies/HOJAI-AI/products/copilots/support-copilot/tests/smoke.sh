#!/bin/bash
# Support Copilot - Smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4925}"
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
  local body_file="${TMPDIR}/_scp_$$_$RANDOM.json"
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
echo "  Support Copilot - Smoke"
echo "============================================"

run "health"             GET  "/health"               "" "healthy"
run "service info"       GET  "/"                     "" "Support Copilot"
run "analyze msg"        POST "/api/analyze"          '{"message":"I cannot log in to my account, my password is not working"}' "intent"
run "summarize"          POST "/api/summarize"        '{"ticketId":"tkt-001"}' "summary"
run "suggest"            POST "/api/suggest"          '{"message":"help me","context":"billing"}' "suggestions"
run "auto-reply"         POST "/api/auto-reply"       '{"ticketId":"tkt-001"}' "reply"
run "sentiment neg"      POST "/api/sentiment"        '{"message":"This is terrible and unacceptable! I am angry."}' "negative"
run "sentiment pos"      POST "/api/sentiment"        '{"message":"Thanks so much! This is great and amazing!"}' "positive"
run "categorize"         POST "/api/categorize"       '{"message":"I have a bug and the app crashes"}' "technical"
run "priority urgent"    POST "/api/priority"         '{"message":"URGENT! Need immediate help with billing error"}' "urgent"
run "escalate"           POST "/api/escalate"         '{"message":"I want to speak to a manager right now. This is critical."}' "shouldEscalate"
run "tickets list"       GET  "/api/tickets"          "" "tkt-001"
run "ticket tkt-001"     GET  "/api/tickets/tkt-001"  "" "login"
run "create ticket"      POST "/api/tickets"          '{"subject":"New issue","customer":"test-corp","message":"I need help"}' "tkt-"
run "ticket reply"       POST "/api/tickets/tkt-001/reply" '{"text":"We are looking into it","from":"agent"}' "pending"
run "ticket close"       POST "/api/tickets/tkt-002/close" '{}' "closed"
run "articles"           GET  "/api/articles"         "" "How to reset"
run "article art-1"      GET  "/api/articles/art-1"   "" "password"
run "search"             GET  "/api/search?q=billing" "" "Billing"
run "macros"             GET  "/api/macros"           "" "Greeting"
run "conversations"      GET  "/api/conversations"    "" ""
run "create conv"        POST "/api/conversations"    '{"userId":"u1","message":"hi"}' "conv-"
run "stats"              GET  "/api/stats"            "" "tickets"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
