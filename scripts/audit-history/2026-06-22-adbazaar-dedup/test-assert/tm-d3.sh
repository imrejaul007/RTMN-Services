showargs() {
  echo "argc=$#"
  for i in "$@"; do
    echo "  arg=[$i]"
  done
}
PORT=12345
SLUG="bad-$RANDOM"
# Use single quotes for JSON body, concat SLUG via var
BODY='{"name":"X","slug":"'$SLUG'","plan":"galactic"}'
showargs "POST test" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/test \
  -H 'Content-Type: application/json' -d "$BODY")" "400"
