#!/bin/bash
# Stop all services
docker-compose down
pkill -f "hojai-whatsapp" || true
echo "✓ Stopped"
