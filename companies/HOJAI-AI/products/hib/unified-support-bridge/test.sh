#!/bin/bash
set -e
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/hib/unified-support-bridge

# Kill existing
lsof -ti:4885 | xargs kill -9 2>/dev/null || true
sleep 2

# Start
echo "Starting service..."
USE_REDIS=false USE_MONGODB=false node src/index.js &
sleep 4

# Test
echo "=== Health ==="
curl -s http://localhost:4885/health

echo ""
echo "=== WhatsApp Challenge ==="
curl -s "http://localhost:4885/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=usb-verify-token-change-me&hub.challenge=OK123"

echo ""
echo "=== WhatsApp Message ==="
curl -s -X POST http://localhost:4885/api/webhooks/whatsapp -H "Content-Type: application/json" -d '{"from":"+919876543210","contactName":"Rahul","text":"Hello"}'

echo ""
echo "=== Email Message ==="
curl -s -X POST http://localhost:4885/api/webhooks/email -H "Content-Type: application/json" -d '{"from":"priya@techcorp.com","subject":"Help","text":"I need assistance"}'

echo ""
echo "=== App Message ==="
curl -s -X POST http://localhost:4885/api/webhooks/app -H "Content-Type: application/json" -d '{"appUserId":"usr_123","message":"Hello","platform":"do-app"}'

echo ""
echo "=== Stats ==="
curl -s http://localhost:4885/api/stats

echo ""
echo "=== SSE ==="
curl -s -N --max-time 2 http://localhost:4885/api/events/stream

echo ""
echo "=== Generate Key ==="
curl -s -X POST http://localhost:4885/api/admin/keys/generate

echo ""
echo "DONE"
