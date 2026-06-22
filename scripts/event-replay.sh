#!/bin/bash
# event-replay.sh — read recent events from the RTMN event bus (ADR-0009 Phase 2)
# ----------------------------------------------------------------------------
# Backed by Redis Streams. Reads from the `rtmn:events` stream and prints
# each event as a one-line JSON object. Useful for ops debugging + incident
# reconstruction.
#
# Usage:
#   bash scripts/event-replay.sh                    # last 50 events
#   bash scripts/event-replay.sh --count 200        # last 200
#   bash scripts/event-replay.sh --type decision.*  # filter by type pattern
#   bash scripts/event-replay.sh --tenant acme      # filter by tenantId
#   bash scripts/event-replay.sh --from 1737000000000-0   # starting at a specific Stream id
#   bash scripts/event-replay.sh --forward http://localhost:4500/webhook  # POST each event to a URL
#   bash scripts/event-replay.sh --watch           # tail the stream
#
# Env vars:
#   REDIS_URL   (default redis://localhost:6379)
#   STREAM_NAME (default rtmn:events)
#
# Exit codes:
#   0  ok
#   1  bad args
#   2  redis not reachable
#   3  stream doesn't exist yet

set -u

REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
STREAM_NAME="${STREAM_NAME:-rtmn:events}"
COUNT=50
TYPE_PATTERN=""
TENANT_FILTER=""
FROM_ID=""
FORWARD_URL=""
WATCH=false

while [ $# -gt 0 ]; do
  case "$1" in
    --count)   COUNT="$2"; shift 2;;
    --type)    TYPE_PATTERN="$2"; shift 2;;
    --tenant)  TENANT_FILTER="$2"; shift 2;;
    --from)    FROM_ID="$2"; shift 2;;
    --forward) FORWARD_URL="$2"; shift 2;;
    --watch)   WATCH=true; shift;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0;;
    *)
      echo "Unknown option: $1" >&2
      exit 1;;
  esac
done

if ! command -v redis-cli >/dev/null 2>&1; then
  echo "redis-cli not found; install with 'brew install redis' or equivalent" >&2
  exit 2
fi

# Quick connectivity check
if ! redis-cli -u "$REDIS_URL" ping 2>/dev/null | grep -q PONG; then
  echo "Redis not reachable at $REDIS_URL" >&2
  exit 2
fi

# Stream must exist
STREAM_LEN=$(redis-cli -u "$REDIS_URL" XLEN "$STREAM_NAME" 2>/dev/null)
if [ -z "$STREAM_LEN" ] || [ "$STREAM_LEN" = "(nil)" ]; then
  echo "Stream $STREAM_NAME does not exist yet (no events published)" >&2
  exit 3
fi

echo "# Replaying up to $COUNT events from $STREAM_NAME ($STREAM_LEN total)" >&2

emit_event() {
  local id="$1"
  local json="$2"
  if [ -n "$TYPE_PATTERN" ]; then
    local type
    type=$(echo "$json" | grep -oE '"type":"[^"]+"' | head -1 | sed 's/"type":"\(.*\)"/\1/')
    if ! echo "$type" | grep -qE "^$(echo "$TYPE_PATTERN" | sed 's/\*/[^\.]*/g')$"; then
      return
    fi
  fi
  if [ -n "$TENANT_FILTER" ]; then
    local tid
    tid=$(echo "$json" | grep -oE '"tenantId":"[^"]*"' | head -1 | sed 's/"tenantId":"\(.*\)"/\1/')
    if [ "$tid" != "$TENANT_FILTER" ]; then
      return
    fi
  fi
  if [ -n "$FORWARD_URL" ]; then
    curl -s -X POST -H 'Content-Type: application/json' -d "$json" "$FORWARD_URL" >/dev/null
    return
  fi
  echo "$id $json"
}

if [ "$WATCH" = true ]; then
  # Tail the stream using XREAD BLOCK
  LAST_ID="${FROM_ID:-}"
  echo "# Watching $STREAM_NAME (Ctrl-C to stop)..." >&2
  while true; do
    RESP=$(redis-cli -u "$REDIS_URL" XREAD BLOCK 5000 COUNT "$COUNT" STREAMS "$STREAM_NAME" "${LAST_ID:-\$}" 2>/dev/null)
    if [ -z "$RESP" ]; then continue; fi
    # Parse the simple RESP-style output. Format: 1) "stream" 2) 1) "id" 3) 1) "data" 4) "json"  ...
    echo "$RESP" | while IFS= read -r line; do
      id=$(echo "$line" | grep -oE '^[0-9]+\) "[0-9]+-[0-9]+"' | head -1 | sed 's/.*"\([0-9]*-[0-9]*\)"/\1/')
      json=$(echo "$line" | grep -oE '^4) ".*"' | head -1 | sed 's/^4) "//;s/"$//' | sed 's/\\"/"/g')
      if [ -n "$id" ] && [ -n "$json" ]; then
        LAST_ID="$id"
        emit_event "$id" "$json"
      fi
    done
  done
  exit 0
fi

# One-shot replay: XRANGE from earliest to + (or from $FROM_ID)
START="${FROM_ID:-(}"
END="+"
RAW=$(redis-cli -u "$REDIS_URL" XRANGE "$STREAM_NAME" "$START" "$END" COUNT "$COUNT" 2>/dev/null)
echo "$RAW" | while IFS= read -r line; do
  id=$(echo "$line" | grep -oE '^[0-9]+\) "[0-9]+-[0-9]+"' | head -1 | sed 's/.*"\([0-9]*-[0-9]*\)"/\1/')
  json=$(echo "$line" | grep -oE '^4) ".*"' | head -1 | sed 's/^4) "//;s/"$//' | sed 's/\\"/"/g')
  if [ -n "$id" ] && [ -n "$json" ]; then
    emit_event "$id" "$json"
  fi
done
