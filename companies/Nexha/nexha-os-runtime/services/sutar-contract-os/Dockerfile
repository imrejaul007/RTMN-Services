# SUTAR Contract OS — Docker build stub
# ===============================================================
# SOURCE: ../../../HOJAI-AI/sutar-os/contracts/sutar-contract-os/
# ENTRY:  dist/index.js (TypeScript)
#
# To build this image locally:
#   docker build -t ghcr.io/rtmn/sutar-contract-os:latest \
#     -f services/sutar-contract-os/Dockerfile \
#     ../../../HOJAI-AI/sutar-os/contracts/sutar-contract-os/
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
  CMD wget -q --spider http://localhost:4292/health || exit 1
EXPOSE 4292
CMD ["node", "dist/index.js"]
