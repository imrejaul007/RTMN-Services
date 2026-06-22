#!/usr/bin/env bash
set -e
PORT=${PORT:-4167}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[knowledge-distillation smoke]"
run health 200 "$BASE/health"
run models 200 "$BASE/api/models"
run runs 200 "$BASE/api/runs"
TID=$(curl -sS $BASE/api/models | python3 -c 'import sys,json;ps=json.load(sys.stdin)["models"];print([m["id"] for m in ps if m["role"]=="teacher"][0])')
SID=$(curl -sS $BASE/api/models | python3 -c 'import sys,json;ps=json.load(sys.stdin)["models"];print([m["id"] for m in ps if m["role"]=="student"][0])')
run m_get 200 "$BASE/api/models/$TID"
run m_404 404 "$BASE/api/models/nope"
run m_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-s","role":"student","size_params":"3B","parent_id":"'$TID'"}' "$BASE/api/models"
run m_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/models"
run run_create 201 -X POST -H 'Content-Type: application/json' -d "{\"teacher_id\":\"$TID\",\"student_id\":\"$SID\",\"examples\":[{\"in\":\"x\",\"out\":\"y\"}]}" "$BASE/api/runs"
run run_bad_teacher 400 -X POST -H 'Content-Type: application/json' -d "{\"teacher_id\":\"$SID\",\"student_id\":\"$SID\",\"examples\":[]}" "$BASE/api/runs"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL