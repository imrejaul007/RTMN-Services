#!/bin/bash
# Start all services
docker-compose up -d
sleep 5
./health-check.sh
