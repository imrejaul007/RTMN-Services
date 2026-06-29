#!/bin/bash
# HOJAI Local Development Setup

set -e

echo "🚀 HOJAI Local Setup"

# Check requirements
command -v node >/dev/null 2>&1 || { echo "Node required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }

# Create .env if missing
if [ ! -f .env ]; then
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
  echo "✅ Created .env"
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd platform/services/hojai-api && npm install
cd ../../connectors/twilio-sms-connector && npm install
cd ../twilio-voice-connector && npm install
cd ../whatsapp-business-connector && npm install
cd ../background-check-connector && npm install
cd ../meeting-recording-connector && npm install
cd ../voice-to-task-connector && npm install

cd ../../../services
for service in reply-drafting-service refund-approval-service root-cause-service roi-calculator-service; do
  cd $service && npm install && cd ..
done

# Start services
echo "🐳 Starting Docker..."
cd ../../docker && docker-compose up -d

echo "✅ HOJAI running on port 4500"
echo "Test: curl http://localhost:4500/health"
