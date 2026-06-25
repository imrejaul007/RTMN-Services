# SUTAR Negotiation Engine — Docker build stub
# ===============================================================
# SOURCE: ../../../HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/
# ENTRY:  dist/index.js (TypeScript)
# NOTE: Port 4293 is used by nexha-autonomous-logistics in the Nexha monorepo.
#       This service uses 4295 in Nexha OS runtime to avoid the port conflict.
#
# To build this image locally:
#   docker build -t ghcr.io/rtmn/sutar-negotiation-engine:latest \
#     -f services/sutar-negotiation-engine/Dockerfile \
#     ../../../HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/
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
# Port 4295 (avoid conflict with nexha-autonomous-logistics at 4293)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4295/health || exit 1
EXPOSE 4295
CMD ["node", "dist/index.js"]
