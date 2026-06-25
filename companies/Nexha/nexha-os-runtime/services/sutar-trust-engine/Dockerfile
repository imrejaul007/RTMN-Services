# SUTAR Trust Engine — Docker build stub
# ===============================================================
# SOURCE: ../../../HOJAI-AI/sutar-os/core/sutar-trust-engine/
# ENTRY:  dist/index.js (TypeScript — needs npm run build)
#
# To build this image locally:
#   docker build -t ghcr.io/rtmn/sutar-trust-engine:latest \
#     -f services/sutar-trust-engine/Dockerfile \
#     ../../../HOJAI-AI/sutar-os/core/sutar-trust-engine/
# ===============================================================

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY --from=builder --chown=nexha:nexha /app/dist ./dist
COPY --from=builder --chown=nexha:nexha /app/node_modules ./node_modules
COPY package*.json ./
USER nexha
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4291/health || exit 1
EXPOSE 4291
CMD ["node", "dist/index.js"]
