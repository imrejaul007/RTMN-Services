#!/bin/bash
# Demo test script
# Usage: ./demo.sh [phone] [message]

PHONE=${1:-+919876543210}
MSG=${2:-"Hi"}
URL=http://localhost:4570

echo "Sending test message to $PHONE: $MSG"

curl -X POST "$URL/api/messages/send" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"$PHONE\",\"body\":\"$MSG\"}" | jq .

echo "✓ Message sent"
