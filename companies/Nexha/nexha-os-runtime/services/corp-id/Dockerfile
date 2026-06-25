# CorpID Service — Docker build stub
# ===============================================================
# SOURCE: ../../../HOJAI-AI/platform/identity/corpid-service/
# ENTRY:  src/index.persistent.js (pure JS)
#
# To build this image locally:
#   docker build -t ghcr.io/rtmn/corpid-service:latest \
#     -f services/corp-id/Dockerfile \
#     ../../../HOJAI-AI/platform/identity/corpid-service/
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src
USER nexha
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4702/health || exit 1
EXPOSE 4702
CMD ["node", "src/index.persistent.js"]
