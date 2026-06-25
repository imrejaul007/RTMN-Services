# TwinOS Hub — Docker build
# ===============================================================
# HOJAI-AI/platform/twins/twinos-hub/
# Entry:  src/index.js (ESM)
#
# Workspace deps resolved: @rtmn/twinos-shared (via ../twinos-shared/)
# Build context: ../../../HOJAI-AI/platform/twins/twinos-hub/
#
# Build from nexha-os-runtime/:
#   docker build -t nexha-twinos:latest \
#     -f services/twinos-hub/Dockerfile \
#     ../services/nexha-gateway/../../../HOJAI-AI/platform/twins/twinos-hub/
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --omit=dev

# Resolve workspace symlinks: twinos-shared/
# Package uses: "@rtmn/twinos-shared": "file:../twinos-shared"
COPY ../twinos-shared/ ./twinos-shared/

# Copy source
COPY src/ ./src/

USER nexha
EXPOSE 4705
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4705/health || exit 1
CMD ["node", "src/index.js"]
