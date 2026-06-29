FROM node:20-alpine

WORKDIR /app

# Install all workspaces
COPY platform/services/hojai-api/package*.json ./api/
COPY platform/connectors/twilio-sms-connector/package*.json ./connectors/twilio-sms/
COPY platform/connectors/twilio-voice-connector/package*.json ./connectors/twilio-voice/
COPY platform/connectors/whatsapp-business-connector/package*.json ./connectors/whatsapp/
COPY platform/connectors/background-check-connector/package*.json ./connectors/background/
COPY platform/connectors/meeting-recording-connector/package*.json ./connectors/meeting/
COPY platform/connectors/voice-to-task-connector/package*.json ./connectors/voice-task/
COPY platform/services/reply-drafting-service/package.json ./services/reply-drafting/
COPY platform/services/refund-approval-service/package.json ./services/refund/
COPY platform/services/root-cause-service/package.json ./services/root-cause/
COPY platform/services/roi-calculator-service/package.json ./services/roi/

# Install API + connectors + services
WORKDIR /app/api
RUN npm install
WORKDIR /app/connectors/twilio-sms && npm install
WORKDIR /app/connectors/twilio-voice && npm install
WORKDIR /app/connectors/whatsapp && npm install
WORKDIR /app/connectors/background && npm install
WORKDIR /app/connectors/meeting && npm install
WORKDIR /app/connectors/voice-task && npm install
WORKDIR /app/services/reply-drafting && npm install
WORKDIR /app/services/refund && npm install
WORKDIR /app/services/root-cause && npm install
WORKDIR /app/services/roi && npm install

# Copy all source code
WORKDIR /app
COPY platform/services/hojai-api/src ./api/src
COPY platform/connectors/twilio-sms-connector/src ./connectors/twilio-sms/src
COPY platform/connectors/twilio-voice-connector/src ./connectors/twilio-voice/src
COPY platform/connectors/whatsapp-business-connector/src ./connectors/whatsapp/src
COPY platform/connectors/background-check-connector/src ./connectors/background/src
COPY platform/connectors/meeting-recording-connector/src ./connectors/meeting/src
COPY platform/connectors/voice-to-task-connector/src ./connectors/voice-task/src
COPY platform/services/reply-drafting-service/src ./services/reply-drafting/src
COPY platform/services/refund-approval-service/src ./services/refund/src
COPY platform/services/root-cause-service/src ./services/root-cause/src
COPY platform/services/roi-calculator-service/src ./services/roi/src

ENV NODE_PATH=/app/api/node_modules:/app/connectors/twilio-sms/node_modules
ENV NODE_PATH=$NODE_PATH:/app/connectors/twilio-voice/node_modules

EXPOSE 4500

CMD ["node", "api/src/index.js"]
