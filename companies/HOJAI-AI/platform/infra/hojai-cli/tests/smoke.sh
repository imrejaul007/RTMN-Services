#!/usr/bin/env bash
set -e
PORT=${PORT:-4170}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[hojai-cli smoke]"
run health 200 "$BASE/health"
run commands 200 "$BASE/api/commands"
run command_get 200 "$BASE/api/commands/init"
run command_404 404 "$BASE/api/commands/nope"
run run 201 -X POST -H 'Content-Type: application/json' -d '{"command":"status"}' "$BASE/api/run"
run run_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/run"
run run_404 404 -X POST -H 'Content-Type: application/json' -d '{"command":"unknown"}' "$BASE/api/run"
run runs 200 "$BASE/api/runs"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL