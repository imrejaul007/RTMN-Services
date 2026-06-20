#!/usr/bin/env bash
set -e
PORT=${PORT:-4161}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[company-intelligence-rendez e2e]"
CAP=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;ps=json.load(sys.stdin)["templates"];print([p["id"] for p in ps if "Capacity" in p["name"]][0])')
step "capacity run" -X POST -H 'Content-Type: application/json' -d '{"venue_capacity":500,"rsvp_count":420}' "$BASE/api/templates/$CAP/run"
step "all events" "$BASE/api/events"
step "create event" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-evt","date":"2026-08-15","venue_capacity":150}' "$BASE/api/events"
step "templates again" "$BASE/api/templates"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL