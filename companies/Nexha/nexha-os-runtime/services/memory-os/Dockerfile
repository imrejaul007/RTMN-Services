# MemoryOS — Docker build
# ===============================================================
# HOJAI-AI/platform/memory/memory-os/
# Entry:  src/index.js (pure JS, no workspace deps)
#
# Build context: ../../../HOJAI-AI/platform/memory/memory-os/
#
# Build from nexha-os-runtime/:
#   docker build -t nexha-memory:latest \
#     -f services/memory-os/Dockerfile \
#     ../services/nexha-gateway/../../../HOJAI-AI/platform/memory/memory-os/
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
USER nexha
EXPOSE 4703
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4703/health || exit 1
CMD ["node", "src/index.js"]
