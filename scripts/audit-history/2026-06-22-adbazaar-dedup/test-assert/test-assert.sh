assert() {
  local label="$1"; local actual="$2"; local expected="$3"
  echo "label=[$label]"
  echo "actual=[$actual]"
  echo "expected=[$expected]"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $label  ($actual)"
  else
    echo "FAIL  $label  expected=$expected got=$actual"
  fi
}
PORT=12345
assert "test label" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/test \
  -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"slug\":\"bad-$RANDOM\",\"plan\":\"galactic\"}")" "400"
