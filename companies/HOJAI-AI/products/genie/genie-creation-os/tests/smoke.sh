#!/bin/bash
# Genie Creation OS - Smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4725}"
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
  local body_file="${TMPDIR}/_gco_$$_$RANDOM.json"
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
echo "  Genie Creation OS - Smoke"
echo "============================================"

run "health"              GET  "/health"  "" "healthy"
run "service info"        GET  "/"        "" "Genie Creation OS"
run "content types"       GET  "/content/types"   "" "Blog Post"
run "content styles"      GET  "/content/styles"  "" ""
run "image styles"        GET  "/image/styles"    "" ""
run "image ratios"        GET  "/image/ratios"    "" ""
run "video types"         GET  "/video/types"     "" "Short Form"
run "audio voices"        GET  "/audio/voices"    "" ""
run "audio languages"     GET  "/audio/languages" "" ""
run "audio styles"        GET  "/audio/styles"    "" ""
run "templates list"      GET  "/templates/content" "" ""
run "templates categories" GET  "/templates/categories" "" ""
run "document types"      GET  "/document/types/all" "" ""
run "draft content"       POST "/content/draft"   '{"userId":"u1","title":"T","type":"blog"}' "Draft created"
run "generate content"    POST "/content/generate" '{"userId":"u1","topic":"AI","type":"blog"}' "success"
run "generate image"      POST "/image/generate"   '{"userId":"u1","prompt":"a cat"}' "success"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
