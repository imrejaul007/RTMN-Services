# Memory OS — Docker build stub
# ===============================================================
# SOURCE: ../../../HOJAI-AI/platform/memory/memory-os/
# ENTRY:  src/index.js (pure JS)
#
# To build this image locally:
#   docker build -t ghcr.io/rtmn/memory-os:latest \
#     -f services/memory-os/Dockerfile \
#     ../../../HOJAI-AI/platform/memory/memory-os/
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src
USER nexha
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4703/health || exit 1
EXPOSE 4703
CMD ["node", "src/index.js"]
