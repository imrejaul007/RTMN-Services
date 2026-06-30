#!/bin/bash
# ==============================================================================
# Genie + VoiceOS Complete Stack Startup
# Starts ALL services for the complete meeting intelligence pipeline
#
# Services started:
# - MongoDB (for meeting storage)
# - Redis (for caching)
# - EmotionOS Gateway (4760)
# - Voice Emotion Detection (4768) ← MOVED from 4760
# - Genie Gateway (4701)
# - Genie OS Runtime (7100)
# - Decision Twin (4741)
# - Speaker Diarization (4894)
# - Voice Embedding (4895)
# - Meeting Intelligence (4890)
# - Meeting Storage (4896)
# - Voice Cloning (4897)
# - Speech Adapters
# - LLM Adapters
# ==============================================================================

set -e

GENIE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie"
VOICE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/voice"
STORAGE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/storage"
INTELLIGENCE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/intelligence"
LOG_DIR="/tmp/genie-voice-logs"
mkdir -p "$LOG_DIR"

echo "================================================================"
echo "  Genie + VoiceOS Complete Stack"
echo "  $(date)"
echo "================================================================"

# Start MongoDB if not running
if ! mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "Starting MongoDB..."
    brew services start mongodb/brew/mongodb-community 2>/dev/null || \
    mongod --dbpath /usr/local/var/mongodb --fork --logpath /tmp/mongodb.log
    sleep 3
fi

# Start Redis if not running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Starting Redis..."
    redis-server --daemonize yes
    sleep 2
fi

# ─────────────────────────────────────────────────────────────────────────────
# EmotionOS Services
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "Starting EmotionOS services..."

EMOTION_SERVICES=(
    "emotion-os-gateway:4760:$GENIE_DIR/../../../platform/emotion/emotion-os-gateway"
    "voice-emotion-detection:4768:$GENIE_DIR/../../../platform/emotion/voice-emotion-detection"
    "emotional-memory:4761:$GENIE_DIR/../../../platform/emotion/emotional-memory"
    "empathy-response-engine:4762:$GENIE_DIR/../../../platform/emotion/empathy-response-engine"
    "emotion-analytics:4763:$GENIE_DIR/../../../platform/emotion/emotion-analytics"
    "emotional-journey:4764:$GENIE_DIR/../../../platform/emotion/emotional-journey"
    "emotion-alerts:4765:$GENIE_DIR/../../../platform/emotion/emotion-alerts"
    "cross-modal-emotion:4766:$GENIE_DIR/../../../platform/emotion/cross-modal-emotion"
    "tone-analysis:4767:$GENIE_DIR/../../../platform/emotion/tone-analysis"
)

for entry in "${EMOTION_SERVICES[@]}"; do
    IFS=':' read -r name port dir <<< "$entry"
    if [ -d "$dir/src" ]; then
        echo "  Starting $name (:$port)..."
        cd "$dir"
        [ ! -d "node_modules" ] && npm install --silent 2>&1 | tail -1
        PORT=$port nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
        echo "    PID: $!"
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# VoiceOS Services
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "Starting VoiceOS services..."

VOICE_SERVICES=(
    "voice-gateway:4880:$VOICE_DIR/voice-gateway"
    "voice-identity:4884:$VOICE_DIR/voice-identity"
    "conversation-physics:4881:$VOICE_DIR/conversation-physics"
    "speaker-diarization:4894:$VOICE_DIR/speaker-diarization"
    "voice-embedding:4895:$VOICE_DIR/voice-embedding"
    "meeting-intelligence:4890:$VOICE_DIR/meeting-intelligence"
    "voice-cloning:4897:$VOICE_DIR/voice-cloning"
)

for entry in "${VOICE_SERVICES[@]}"; do
    IFS=':' read -r name port dir <<< "$entry"
    if [ -d "$dir/src" ]; then
        echo "  Starting $name (:$port)..."
        cd "$dir"
        [ ! -d "node_modules" ] && npm install --silent 2>&1 | tail -1
        PORT=$port nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
        echo "    PID: $!"
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# Genie Services
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "Starting Genie services..."

GENIE_SERVICES=(
    "genie-gateway:4701:$GENIE_DIR/genie-gateway"
    "genie-constitution:4743:$GENIE_DIR/genie-constitution"
    "genie-decision-intelligence:4740:$GENIE_DIR/genie-decision-intelligence"
    "genie-decision-twin:4741:$GENIE_DIR/genie-decision-twin"
    "genie-calendar-service:4709:$GENIE_DIR/genie-calendar-service"
    "genie-briefing-service:4712:$GENIE_DIR/genie-briefing-service"
    "genie-memory-inbox:4736:$GENIE_DIR/genie-memory-inbox"
    "genie-relationship-os:4718:$GENIE_DIR/genie-relationship-os"
    "genie-learning-loop:4742:$GENIE_DIR/genie-learning-loop"
    "genie-anticipation:4745:$GENIE_DIR/genie-anticipation"
    "genie-ambient:4746:$GENIE_DIR/genie-ambient"
    "genie-financial-life:4747:$GENIE_DIR/genie-financial-life"
    "genie-health-intelligence:4748:$GENIE_DIR/genie-health-intelligence"
    "genie-household:4749:$GENIE_DIR/genie-household"
    "genie-life-simulation:4752:$GENIE_DIR/genie-life-simulation"
    "genie-focus:4753:$GENIE_DIR/genie-focus"
    "genie-spiritual:4751:$GENIE_DIR/genie-spiritual"
    "genie-legacy:4755:$GENIE_DIR/genie-legacy"
    "genie-dreams:4754:$GENIE_DIR/genie-dreams"
    "genie-travel:4750:$GENIE_DIR/genie-travel"
)

for entry in "${GENIE_SERVICES[@]}"; do
    IFS=':' read -r name port dir <<< "$entry"
    if [ -d "$dir" ]; then
        if [ -f "$dir/src/index.js" ]; then
            echo "  Starting $name (:$port)..."
            cd "$dir"
            [ ! -d "node_modules" ] && npm install --silent 2>&1 | tail -1
            PORT=$port nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
            echo "    PID: $!"
        elif [ -d "$dir/dist" ]; then
            echo "  Starting $name (:$port)..."
            cd "$dir"
            PORT=$port nohup node dist/index.js > "$LOG_DIR/$name.log" 2>&1 &
            echo "    PID: $!"
        fi
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# Storage & Intelligence Services
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "Starting Storage & Intelligence services..."

OTHER_SERVICES=(
    "meeting-storage:4896:$STORAGE_DIR/meeting-storage"
)

for entry in "${OTHER_SERVICES[@]}"; do
    IFS=':' read -r name port dir <<< "$entry"
    if [ -d "$dir/src" ]; then
        echo "  Starting $name (:$port)..."
        cd "$dir"
        [ ! -d "node_modules" ] && npm install --silent 2>&1 | tail -1
        PORT=$port nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
        echo "    PID: $!"
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
echo "  Health Check (waiting 5s for startup)..."
echo "================================================================"
sleep 5

echo ""
echo "Critical Services:"
for service in "speaker-diarization:4894" "voice-embedding:4895" "meeting-intelligence:4890" "decision-twin:4741" "meeting-storage:4896" "voice-cloning:4897"; do
    IFS=':' read -r name port <<< "$service"
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:$port/health 2>/dev/null || echo "DOWN")
    if [ "$status" = "200" ]; then
        echo "  ✓ $name (:$port)"
    else
        echo "  ✗ $name (:$port) - $status"
    fi
done

echo ""
echo "================================================================"
echo "  Complete Stack Started"
echo "================================================================"
echo ""
echo "Meeting Intelligence Pipeline:"
echo "  Audio → Speaker Diarization (4894)"
echo "         → Voice Embedding (4895)"
echo "         → Meeting Intelligence (4890)"
echo "         → Decision Twin (4741)"
echo "         → Meeting Storage (4896)"
echo "         → Voice Cloning (4897)"
echo ""
echo "Configuration needed for REAL AI:"
echo "  export AZURE_SPEECH_KEY=..."
echo "  export ANTHROPIC_API_KEY=..."
echo "  export ELEVENLABS_API_KEY=..."
echo "  export OPENAI_API_KEY=..."
echo ""
echo "Logs: $LOG_DIR/"
echo "================================================================"
