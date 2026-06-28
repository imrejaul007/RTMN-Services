#!/bin/bash
# Start Unified Support Bridge
# Usage: ./start.sh [dev|redis|mongo|full]

MODE=${1:-dev}

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Unified Support Bridge (mode: $MODE)"

case $MODE in
  dev)
    echo "Mode: dev (in-memory, no deps)"
    USE_REDIS=false USE_MONGODB=false node "$SCRIPT_DIR/src/index.js"
    ;;

  redis)
    echo "Mode: Redis-backed"
    echo "Make sure Redis is running: redis-cli ping"
    USE_REDIS=true USE_MONGODB=false node "$SCRIPT_DIR/src/index.js"
    ;;

  mongo)
    echo "Mode: MongoDB-backed"
    echo "Make sure MongoDB is running"
    USE_REDIS=false USE_MONGODB=true node "$SCRIPT_DIR/src/index.js"
    ;;

  full|prod|production)
    echo "Mode: Full production (Redis + MongoDB)"
    echo "Make sure Redis and MongoDB are running"
    USE_REDIS=true USE_MONGODB=true node "$SCRIPT_DIR/src/index.js"
    ;;

  docker)
    echo "Mode: Docker"
    docker compose up --build -d
    ;;

  docker:logs)
    docker compose logs -f unified-support-bridge
    ;;

  docker:down)
    docker compose down
    ;;

  generate-key)
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ;;

  register-whatsapp)
    echo "Registering WhatsApp webhook..."
    curl -X POST http://localhost:4885/api/admin/webhooks/whatsapp/register \
      -H 'Content-Type: application/json' \
      -d "{\"provider\":\"meta\",\"accessToken\":\"YOUR_ACCESS_TOKEN\",\"phoneNumberId\":\"YOUR_PHONE_ID\"}"
    ;;

  status)
    echo "=== Service Health ==="
    curl -s http://localhost:4885/health | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.stringify(JSON.parse(d),null,2))"
    echo ""
    echo "=== Webhook Status ==="
    curl -s http://localhost:4885/api/admin/webhooks/whatsapp/status | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.stringify(JSON.parse(d),null,2))"
    echo ""
    echo "=== Stats ==="
    curl -s http://localhost:4885/api/stats | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.stringify(JSON.parse(d),null,2))"
    ;;

  test)
    npm test
    ;;

  *)
    echo "Usage: $0 [dev|redis|mongo|full|docker|docker:logs|docker:down|generate-key|register-whatsapp|status|test]"
    echo ""
    echo "Modes:"
    echo "  dev         - In-memory (no deps, fastest startup)"
    echo "  redis       - Redis-backed storage"
    echo "  mongo       - MongoDB-backed storage"
    echo "  full        - Redis + MongoDB (full production)"
    echo "  docker      - Run via docker-compose"
    echo "  docker:logs - Tail Docker logs"
    echo "  docker:down - Stop Docker containers"
    echo "  generate-key - Generate a new webhook API key"
    echo "  register-whatsapp - Register WhatsApp webhook with Meta"
    echo "  status       - Check service health + webhook status"
    echo "  test        - Run unit tests"
    exit 1
    ;;
esac
