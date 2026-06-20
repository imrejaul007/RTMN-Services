#!/usr/bin/env bash
set -e
PORT=${PORT:-4167}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[knowledge-distillation e2e]"
TID=$(curl -sS $BASE/api/models | python3 -c 'import sys,json;ps=json.load(sys.stdin)["models"];print([m["id"] for m in ps if m["name"]=="gpt-4"][0])')
SID=$(curl -sS $BASE/api/models | python3 -c 'import sys,json;ps=json.load(sys.stdin)["models"];print([m["id"] for m in ps if m["name"]=="hojai-mini"][0])')
step "run 100 ex" -X POST -H 'Content-Type: application/json' -d "{\"teacher_id\":\"$TID\",\"student_id\":\"$SID\",\"examples\":[$(seq -s, 1 100 | sed 's/[^,]*/{"i":1}/g')]}" "$BASE/api/runs"
step "run 1000 ex" -X POST -H 'Content-Type: application/json' -d "{\"teacher_id\":\"$TID\",\"student_id\":\"$SID\",\"examples\":[$(seq -s, 1 1000 | sed 's/[^,]*/{"i":1}/g')]}" "$BASE/api/runs"
step "all runs" "$BASE/api/runs"
step "models" "$BASE/api/models"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL