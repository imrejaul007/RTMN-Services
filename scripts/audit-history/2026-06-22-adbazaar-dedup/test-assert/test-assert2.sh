assert() {
  local label="$1"; local actual="$2"; local expected="$3"
  echo "label=[$label]"
  echo "actual=[$actual]"
  echo "expected=[$expected]"
}
PORT=47703
assert "test label" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants   -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"slug\":\"bad-$RANDOM\",\"plan\":\"galactic\"}")" "400"
