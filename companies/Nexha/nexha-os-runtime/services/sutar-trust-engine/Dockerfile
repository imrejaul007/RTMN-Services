# SUTAR Trust Engine — Docker build
# ===============================================================
# HOJAI-AI/sutar-os/core/sutar-trust-engine/
# Entry:  dist/index.js (TypeScript)
# Needs:  @rtmn/shared (workspace symlink → ../../../shared)
#
# Build context: ../../../HOJAI-AI/sutar-os/core/sutar-trust-engine/
# Build from nexha-os-runtime/:
#   docker build -t nexha-sutar-trust-engine:latest \
#     -f services/sutar-trust-engine/Dockerfile \
#     ../services/nexha-gateway/../../../HOJAI-AI/sutar-os/core/sutar-trust-engine/
# ===============================================================

FROM node:20-alpine AS builder
WORKDIR /app

# Package files + install all deps (incl devDeps for tsx/tsc)
COPY package*.json tsconfig.json ./
RUN npm ci

# Resolve workspace symlink: @rtmn/shared → ../../../shared
COPY ../../../shared/ ./shared/

# Copy source + build
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001

# Copy compiled dist + production deps
COPY --from=builder --chown=nexha:nexha /app/dist ./dist
COPY --from=builder --chown=nexha:nexha /app/node_modules ./node_modules

# Copy shared/ for runtime (compiled JS imports it)
COPY --from=builder --chown=nexha:nexha /app/shared/ ./shared/

# Copy package.json for reference
COPY package*.json ./

USER nexha
EXPOSE 4291
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4291/health || exit 1
CMD ["node", "dist/index.js"]
