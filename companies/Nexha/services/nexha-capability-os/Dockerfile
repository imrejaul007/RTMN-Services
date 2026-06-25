# Nexha CapabilityOS — Docker
# TypeScript multi-stage build. Context: companies/Nexha/services/nexha-capability-os/
# Build from nexha-os-runtime/:
#   docker build -t nexha-capability-os:latest \
#     -f services/nexha-capability-os/Dockerfile \
#     ../services/nexha-capability-os/

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
EXPOSE 4270
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget -q --spider http://localhost:4270/health || exit 1
CMD ["node", "dist/index.js"]
