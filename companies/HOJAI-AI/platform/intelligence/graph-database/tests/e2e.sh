#!/bin/bash
# graph-database - e2e tests (port 4783)
# Verifies the in-memory property graph end-to-end over real HTTP.
set -u
BASE_URL="${BASE_URL:-http://localhost:4783}"
PASS=0; FAIL=0
TMPDIR="${TMPDIR:-/tmp}"

# Skip if service not running
if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/api/health" 2>/dev/null; then
  echo "  SKIP  Service not running at ${BASE_URL}"
  exit 0
fi

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-}" expect_code="${6:-}"
  local body_file="${TMPDIR}/_graph_e2e_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  local body=$(cat "$body_file" 2>/dev/null)
  if [ -n "$expect_code" ]; then
    if [ "$code" = "$expect_code" ]; then
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
echo "  graph-database - e2e (port 4783)"
echo "============================================"

# Health
run "GET /api/health" GET "/api/health" "" "" "200"

# Create node and capture id
NODE_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"labels":["Person"],"properties":{"name":"TestUser","age":99}}' \
  "${BASE_URL}/api/nodes")
NODE_ID=$(echo "$NODE_RESP" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
echo "  INFO  Created node: $NODE_ID"

run "GET /api/nodes/{id}" GET "/api/nodes/${NODE_ID}" "" "" "200"
run "GET /api/nodes?label=Person" GET "/api/nodes?label=Person" "" "" "200"
run "GET /api/nodes (all)" GET "/api/nodes" "" "" "200"
run "PATCH /api/nodes/{id}" PATCH "/api/nodes/${NODE_ID}" '{"properties":{"age":100}}' "" "200"
run "GET /api/labels" GET "/api/labels" "" "" "200"
run "GET /api/edge-types" GET "/api/edge-types" "" "" "200"
run "GET /api/stats" GET "/api/stats" "" "" "200"
run "GET /api/audit" GET "/api/audit" "" "" "200"

# Delete the test node
run "DELETE /api/nodes/{id}" DELETE "/api/nodes/${NODE_ID}" "" "" "200"
run "GET /api/nodes/{id} (404 after delete)" GET "/api/nodes/${NODE_ID}" "" "" "404"

# 404
run "GET /api/no-such-route (404)" GET "/api/no-such-route" "" "" "404"

echo "============================================"
echo "  e2e Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
