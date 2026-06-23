#!/usr/bin/env bash
# ExecutionOS end-to-end test
set -uo pipefail

PORT="${PORT:-4296}"
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

assert() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $label  ($actual)"
    PASS=$((PASS+1))
  else
    echo "FAIL  $label  (expected $expected, got $actual)"
    FAIL=$((FAIL+1))
  fi
}

# 1. health
status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/health")
assert "GET /health" "200" "$status"

# 2. ready
status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/ready")
assert "GET /ready" "200" "$status"

# 3. POST /api/executions (missing name -> 400)
status=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"steps":[{"kind":"noop"}]}' "${BASE}/api/executions")
assert "POST exec (no name -> 400)" "400" "$status"

# 4. POST /api/executions (missing steps -> 400)
status=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"name":"x"}' "${BASE}/api/executions")
assert "POST exec (no steps -> 400)" "400" "$status"

# 5. POST /api/executions (invalid kind -> 400)
status=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"name":"bad","steps":[{"kind":"magic"}]}' "${BASE}/api/executions")
assert "POST exec (invalid kind -> 400)" "400" "$status"

# 6. POST /api/executions (noop -> 201)
RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"name":"e2e-noop","steps":[{"kind":"noop"}]}' "${BASE}/api/executions")
ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/executions/${ID}")
assert "GET exec/:id" "200" "$status"

# 7. POST /api/executions/:id/run (noop -> success)
RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"name":"run-ok","steps":[{"kind":"noop"},{"kind":"noop"}]}' "${BASE}/api/executions")
ID2=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
RUN=$(curl -s -X POST "${BASE}/api/executions/${ID2}/run")
status=$(echo "$RUN" | grep -o '"status":"success"' | head -1 | cut -d'"' -f4)
assert "POST run (success)" "success" "$status"

# 8. POST /api/executions/:id/run (http missing url -> failed)
RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"name":"bad-http","steps":[{"kind":"http"}]}' "${BASE}/api/executions")
ID3=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
RUN=$(curl -s -X POST "${BASE}/api/executions/${ID3}/run")
status=$(echo "$RUN" | grep -o '"status":"failed"' | head -1 | cut -d'"' -f4)
assert "POST run (http missing url -> failed)" "failed" "$status"

# 9. POST /api/executions/:id/run (http ok)
RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"name":"good-http","steps":[{"kind":"http","payload":{"url":"http://example.com"}}]}' "${BASE}/api/executions")
ID4=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
RUN=$(curl -s -X POST "${BASE}/api/executions/${ID4}/run")
status=$(echo "$RUN" | grep -o '"status":"success"' | head -1 | cut -d'"' -f4)
assert "POST run (http ok -> success)" "success" "$status"

# 10. GET /api/executions (list)
status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/executions")
assert "GET exec (list)" "200" "$status"

# 11. GET /api/executions/missing (404)
status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/executions/missing")
assert "GET exec/missing (404)" "404" "$status"

# 12. POST cancel
RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"name":"to-cancel","steps":[{"kind":"noop"}]}' "${BASE}/api/executions")
ID5=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
CANCEL=$(curl -s -X POST "${BASE}/api/executions/${ID5}/cancel")
status=$(echo "$CANCEL" | grep -o '"status":"cancelled"' | head -1 | cut -d'"' -f4)
assert "POST cancel" "cancelled" "$status"

# 13. POST cancel already-cancelled -> 409
status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE}/api/executions/${ID5}/cancel")
assert "POST cancel (already cancelled -> 409)" "409" "$status"

# 14. DELETE
status=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "${BASE}/api/executions/${ID5}")
assert "DELETE exec (204)" "204" "$status"

# 15. GET audit
status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/executions/audit")
assert "GET audit" "200" "$status"

# 16. GET audit filtered
status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/executions/audit?action=execution.create")
assert "GET audit?action=execution.create" "200" "$status"

# 17. POST with missionId/taskId
status=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"name":"mission-bound","missionId":"m1","taskId":"t1","steps":[{"kind":"noop"}]}' \
  "${BASE}/api/executions")
assert "POST exec with missionId/taskId" "201" "$status"

echo "----"
echo "PASS=${PASS}  FAIL=${FAIL}"
exit ${FAIL}