# CorpID Service — Docker build
# ===============================================================
# Build context: HOJAI-AI/platform/identity/corpid-service/
# Entry:        src/index.persistent.js (ESM)
# Workspace:    @rtmn/shared → HOJAI-AI/shared/
#
# From nexha-os-runtime/, build with:
#   docker build -t nexha-corpid:latest \
#     -f services/corp-id/Dockerfile \
#     ../../../../HOJAI-AI/platform/identity/corpid-service/
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001

# Package files + install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Resolve workspace symlink: @rtmn/shared (file:../../../shared)
# From build context (HOJAI-AI/platform/identity/corpid-service/):
#   ../ → identity/
#   ../../ → platform/
#   ../../../ → HOJAI-AI/
#   ../../../shared → HOJAI-AI/shared/ ✓
COPY ../../../shared/ ./shared/

# Copy source
COPY src/ ./src/

USER nexha
EXPOSE 4702
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4702/health || exit 1
CMD ["node", "src/index.persistent.js"]
