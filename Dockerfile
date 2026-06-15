# RTMN Multi-Service Dockerfile
# Usage: docker build -t rtmn . && docker run -p 4399:4399 rtmn
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy all service source
COPY . .

# Expose pilot-onboarding (primary entry point for client onboarding)
EXPOSE 4399

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4399/health || exit 1

# Default: start pilot-onboarding gateway
CMD ["node", "services/pilot-onboarding/src/index.js"]
