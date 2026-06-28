FROM node:20-alpine

LABEL service="unified-support-bridge"
LABEL maintainer="HOJAI AI"
LABEL version="2.0.0"

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

# Non-root user
RUN addgroup -S usb && adduser -S usb -G usb
USER usb

EXPOSE 4885

ENV NODE_ENV=production
ENV PORT=4885

healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:4885/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s

CMD ["node", "src/index.js"]
