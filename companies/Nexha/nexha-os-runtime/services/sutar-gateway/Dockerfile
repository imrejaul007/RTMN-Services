# SUTAR Gateway — Docker build
# ===============================================================
# HOJAI-AI/sutar-os/core/sutar-gateway/
# Entry:  src/index.js (CommonJS, uses @rtmn/shared)
#
# Workspace deps resolved: @rtmn/shared (via ../../shared/)
# Build context: ../../../HOJAI-AI/sutar-os/core/sutar-gateway/
#
# Build from nexha-os-runtime/:
#   docker build -t nexha-sutar-gateway:latest \
#     -f services/sutar-gateway/Dockerfile \
#     ../services/nexha-gateway/../../../HOJAI-AI/sutar-os/core/sutar-gateway/
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --omit=dev

# Resolve workspace symlink: shared/
# Package uses: "@rtmn/shared": "file:../../shared"
COPY ../../shared/ ./shared/

# Copy source
COPY src/ ./src/

USER nexha
EXPOSE 4140
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4140/health || exit 1
CMD ["node", "src/index.js"]
