#!/usr/bin/env bash
set -e
PORT=${PORT:-4170}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[hojai-cli e2e]"
for c in init deploy status logs twins policies; do step "run $c" -X POST -H 'Content-Type: application/json' -d "{\"command\":\"$c\",\"args\":[\"--test\"]}" "$BASE/api/run"; done
step "all runs" "$BASE/api/runs"
step "all commands" "$BASE/api/commands"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL