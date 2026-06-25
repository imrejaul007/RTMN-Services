# SUTAR Gateway — Docker build stub
# ===============================================================
# This service lives at HOJAI-AI/sutar-os/core/sutar-gateway/
# SOURCE: ../../../HOJAI-AI/sutar-os/core/sutar-gateway/
# ENTRY:  src/index.js (pure JS — no build step needed)
#
# To build this image locally:
#   docker build -t ghcr.io/rtmn/sutar-gateway:latest \
#     -f services/sutar-gateway/Dockerfile \
#     ../../../HOJAI-AI/sutar-os/core/sutar-gateway/
#
# Or add to your CI/CD:
#   docker buildx build --push \
#     --platform linux/amd64,linux/arm64 \
#     -t ghcr.io/YOUR_ORG/sutar-gateway:latest \
#     ../../../HOJAI-AI/sutar-os/core/sutar-gateway/
# ===============================================================

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src
USER nexha
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4140/health || exit 1
EXPOSE 4140
CMD ["node", "src/index.js"]
