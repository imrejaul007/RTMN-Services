#!/bin/bash
# ==============================================================================
# VoiceOS + Meeting Intelligence Startup Script
# Starts the new meeting intelligence pipeline services
#
# New services added (June 30, 2026):
# - speaker-diarization (4894)
# - voice-embedding (4895)
# - meeting-intelligence (4890) - REWRITTEN
# - decision-twin (4741)
# ==============================================================================

set -e

VOICE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/voice"
GENIE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie"
LOG_DIR="/tmp/voice-meeting-logs"
mkdir -p "$LOG_DIR"

echo "================================================================"
echo "  VoiceOS + Meeting Intelligence Startup — $(date)"
echo "================================================================"

# Start new meeting intelligence services
declare -A SERVICES=(
    # Voice platform services
    ["speaker-diarization"]="$VOICE_DIR/speaker-diarization:4894"
    ["voice-embedding"]="$VOICE_DIR/voice-embedding:4895"
    ["meeting-intelligence"]="$VOICE_DIR/meeting-intelligence:4890"
    ["voice-identity-bridge"]="$VOICE_DIR/voice-identity-bridge:4885"
    ["voice-twin-retriever"]="$VOICE_DIR/voice-twin-retriever:4886"
    ["voice-memory-router"]="$VOICE_DIR/voice-memory-router:4887"
    ["voice-relationship-graph"]="$VOICE_DIR/voice-relationship-graph:4888"
    ["voice-action-router"]="$VOICE_DIR/voice-action-router:4889"
    ["voice-analytics-dashboard"]="$VOICE_DIR/voice-analytics-dashboard:4891"
    ["company-voice-profiles"]="$VOICE_DIR/company-voice-profiles:4892"
    ["brand-voice-templates"]="$VOICE_DIR/brand-voice-templates:4893"
    # Genie services
    ["decision-twin"]="$GENIE_DIR/genie-decision-twin:4741"
)

echo ""
echo "Starting meeting intelligence pipeline services..."
echo ""

for service in "${!SERVICES[@]}"; do
    IFS=':' read -r service_dir port <<< "${SERVICES[$service]}"

    if [ -d "$service_dir" ]; then
        echo "Starting $service on port $port..."

        cd "$service_dir"

        if [ ! -d "node_modules" ]; then
            echo "  Installing dependencies..."
            npm install --silent 2>&1 | tail -1 || echo "  (npm install may have failed)"
        fi

        PORT=$port nohup node src/index.js > "$LOG_DIR/$service.log" 2>&1 &
        echo "  PID: $!"
    else
        echo "  ✗ Directory not found: $service_dir"
    fi

    sleep 0.5
done

echo ""
echo "================================================================"
echo "  Checking services..."
echo "================================================================"

sleep 3

# Check new critical services
echo ""
echo "Meeting Intelligence Pipeline:"
for service in "meeting-intelligence:4890" "speaker-diarization:4894" "voice-embedding:4895" "decision-twin:4741"; do
    IFS=':' read -r name port <<< "$service"
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$port/health 2>/dev/null || echo "down")
    if [ "$status" = "200" ]; then
        echo "  ✓ $name (:$port)"
    else
        echo "  ✗ $name (:$port) - $status"
    fi
done

echo ""
echo "Logs: $LOG_DIR/"
echo "================================================================"
echo ""
echo "Services started. Pipeline ready:"
echo "  Audio → Speaker Diarization (4894)"
echo "         → Voice Embedding (4895)"
echo "         → Meeting Intelligence (4890)"
echo "         → Decision Twin (4741)"
echo ""
