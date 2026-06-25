# SUTAR Negotiation Engine — Docker build
# ===============================================================
# HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/
# Entry:  dist/index.js (TypeScript)
# Needs:  @rtmn/shared (workspace symlink → ../../../shared)
# NOTE:   Port 4293 is reserved for nexha-autonomous-logistics.
#         This service uses 4295 in Nexha OS runtime.
#
# Build context: ../../../HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/
# Build from nexha-os-runtime/:
#   docker build -t nexha-sutar-negotiation-engine:latest \
#     -f services/sutar-negotiation-engine/Dockerfile \
#     ../services/nexha-gateway/../../../HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/
# ===============================================================

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

# Resolve workspace symlink: @rtmn/shared → ../../../shared
COPY ../../../shared/ ./shared/

COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001

COPY --from=builder --chown=nexha:nexha /app/dist ./dist
COPY --from=builder --chown=nexha:nexha /app/node_modules ./node_modules
COPY --from=builder --chown=nexha:nexha /app/shared/ ./shared/
COPY package*.json ./

USER nexha
EXPOSE 4295
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4295/health || exit 1
CMD ["node", "dist/index.js"]
