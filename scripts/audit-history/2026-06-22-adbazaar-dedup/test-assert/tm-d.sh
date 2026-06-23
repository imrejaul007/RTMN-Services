showargs() {
  echo "argc=$#"
  for i in "$@"; do
    echo "  arg=[$i]"
  done
}
PORT=12345
showargs "POST test" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/test \
  -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"slug\":\"bad-$RANDOM\",\"plan\":\"galactic\"}")" "400"
