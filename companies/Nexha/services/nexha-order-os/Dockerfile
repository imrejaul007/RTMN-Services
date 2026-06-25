# Nexha OrderOS — Docker build
# ===============================================================
# companies/Nexha/services/nexha-order-os/
# Entry:  src/index.js (ESM)
# Port:   4371
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
USER nexha
EXPOSE 4371
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4371/health || exit 1
CMD ["node", "src/index.js"]
