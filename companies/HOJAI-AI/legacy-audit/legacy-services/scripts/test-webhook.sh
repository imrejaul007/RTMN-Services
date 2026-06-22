#!/bin/bash
# Test webhook locally
# Usage: ./test-webhook.sh [url]

URL=${1:-http://localhost:4570}

echo "Testing WhatsApp webhook..."

# Verify endpoint
VERIFY=$(curl -s "$URL/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=hojai-verify-token&hub.challenge=test")
if [ "$VERIFY" = "test" ]; then
  echo "✓ Webhook verification works"
else
  echo "✗ Webhook verification failed"
fi

# Health check
HEALTH=$(curl -s "$URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
  echo "✓ Health check passed"
else
  echo "✗ Health check failed"
fi

echo ""
echo "Full health response:"
curl -s "$URL/health" | jq .
