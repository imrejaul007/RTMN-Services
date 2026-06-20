#!/usr/bin/env bash
set -e
PORT=${PORT:-4169}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[sdk-python smoke]"
run health 200 "$BASE/health"
run files 200 "$BASE/api/files"
run pyproject 200 "$BASE/api/files?name=pyproject.toml"
run file_get 200 "$BASE/api/files?name=hojai/client.py"
run file_404 404 "$BASE/api/files?name=does/not/exist"
run file_post 200 -X POST -H 'Content-Type: application/json' -d '{"content":"new"}' "$BASE/api/files?name=test.py"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL