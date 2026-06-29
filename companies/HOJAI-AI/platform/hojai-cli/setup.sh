#!/bin/bash
# HOJAI Local Development Setup

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo "🚀 HOJAI Local Setup"

# Check requirements
command -v node >/dev/null 2>&1 || { echo "Node required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }

# Create .env if missing
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cat > .env <<EOF
# Database
POSTGRES_PASSWORD=hojai_secure_change_me

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
AI_CALLBACK_URL=http://host.docker.internal:4500/webhooks/voice/inbound

# WhatsApp Business
WA_PHONE_ID=
WA_ACCESS_TOKEN=
WA_BUSINESS_ID=
WA_VERIFY_TOKEN=hojai-verify
WA_APP_SECRET=

# Zoom
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_ACCOUNT_ID=
ZOOM_WEBHOOK_SECRET=

# LLMs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# AI Engine URLs
AI_AGENT_URL=http://localhost:4004
AI_ENGINE_URL=http://localhost:4500/api
KB_SERVICE_URL=http://localhost:4500/api/knowledge
EOF
  echo "✅ Created .env (please add your API keys)"
fi

# Install dependencies for each service
echo ""
echo "📦 Installing dependencies..."

SERVICES=(
  "services/hojai-api"
  "connectors/twilio-sms-connector"
  "connectors/twilio-voice-connector"
  "connectors/whatsapp-business-connector"
  "connectors/background-check-connector"
  "connectors/meeting-recording-connector"
  "connectors/voice-to-task-connector"
  "services/reply-drafting-service"
  "services/refund-approval-service"
  "services/root-cause-service"
  "services/roi-calculator-service"
)

for service in "${SERVICES[@]}"; do
  if [ -f "$service/package.json" ]; then
    echo "  Installing $service..."
    cd "$service"
    npm install --no-audit --no-fund 2>/dev/null || echo "  ⚠️  Failed: $service"
    cd "$SCRIPT_DIR/.."
  fi
done

# Start Docker services
echo ""
echo "🐳 Starting Docker services..."
cd docker
docker-compose up -d

echo ""
echo "✅ HOJAI is running!"
echo ""
echo "📡 API available at: http://localhost:4500"
echo "💾 Health check: curl http://localhost:4500/health"
echo ""
echo "📚 Endpoints:"
echo "  POST /api/sms/send           - Send SMS"
echo "  POST /api/voice/call         - Make call"
echo "  POST /api/whatsapp/send      - Send WhatsApp"
echo "  POST /api/background-check   - Verify background"
echo "  POST /api/meeting/process    - Process recording"
echo "  POST /api/voice/to-tasks     - Voice to tasks"
echo "  POST /api/reply/draft        - Draft reply"
echo "  POST /api/refund/process     - Process refund"
echo "  POST /api/incidents/analyze  - Analyze incident"
echo "  POST /api/roi/calculate      - Calculate ROI"
