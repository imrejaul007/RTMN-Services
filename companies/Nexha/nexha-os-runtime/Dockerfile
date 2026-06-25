# Nexha OS Runtime — Docker Build File
#
# This Dockerfile builds the nexha-gateway service image.
# Individual service images (corp-id, memory-os, twinos-hub, etc.)
# are built from their own repositories and pulled from GHCR.
#
# To build the gateway locally:
#   docker build -t nexha-gateway:latest .

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Security: non-root user
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN chown -R nexha:nexha /app
USER nexha

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
