#!/usr/bin/env bash
set -euo pipefail
assert() {
  local label="$1"; local actual="$2"; local expected="$3"
  echo "DEBUG: label=[$label] actual=[$actual] expected=[$expected] argc=$#"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $label  ($actual)"
  else
    echo "FAIL  $label  expected=$expected got=$actual"
  fi
}
PORT=12345
SLUG="x"
assert "POST test" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/test \
  -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"slug\":\"bad-$RANDOM\",\"plan\":\"galactic\"}")" "400"
