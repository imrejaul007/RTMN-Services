# HOJAI InternetOS API Server Dockerfile
# Multi-stage build for production

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json files for all components
COPY actor-runtime/package.json actor-runtime/
COPY watcher-runtime/package.json watcher-runtime/
COPY api-server/package.json api-server/
COPY browser-engine/package.json browser-engine/
COPY research-agents/package.json research-agents/
COPY scheduler/package.json scheduler/
COPY twin-bridge/package.json twin-bridge/
COPY change-detection/package.json change-detection/
COPY memorizers/package.json memorizers/
COPY hub-integration/package.json hub-integration/

# Copy source code
COPY actor-runtime/ actor-runtime/
COPY watcher-runtime/ watcher-runtime/
COPY api-server/ api-server/
COPY browser-engine/ browser-engine/
COPY research-agents/ research-agents/
COPY scheduler/ scheduler/
COPY twin-bridge/ twin-bridge/
COPY change-detection/ change-detection/
COPY memorizers/ memorizers/
COPY hub-integration/ hub-integration/

# Build all components
WORKDIR /app/api-server
RUN npm install --omit=dev
WORKDIR /app
RUN cd actor-runtime && npm install --omit=dev && npm run build
RUN cd watcher-runtime && npm install --omit=dev && npm run build
RUN cd browser-engine && npm install --omit=dev && npm run build
RUN cd research-agents && npm install --omit=dev && npm run build
RUN cd scheduler && npm install --omit=dev && npm run build
RUN cd api-server && npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy built artifacts
COPY --from=builder /app/api-server/dist ./dist
COPY --from=builder /app/api-server/node_modules ./node_modules
COPY --from=builder /app/actor-runtime/dist ./node_modules/@hojai/actor-runtime/dist
COPY --from=builder /app/actor-runtime/package.json ./node_modules/@hojai/actor-runtime/
COPY --from=builder /app/watcher-runtime/dist ./node_modules/@hojai/watcher-runtime/dist
COPY --from=builder /app/watcher-runtime/package.json ./node_modules/@hojai/watcher-runtime/
COPY --from=builder /app/browser-engine/dist ./node_modules/@hojai/browser-engine/dist
COPY --from=builder /app/browser-engine/package.json ./node_modules/@hojai/browser-engine/
COPY --from=builder /app/research-agents/dist ./node_modules/@hojai/research-agents/dist
COPY --from=builder /app/research-agents/package.json ./node_modules/@hojai/research-agents/
COPY --from=builder /app/scheduler/dist ./node_modules/@hojai/internet-os-scheduler/dist
COPY --from=builder /app/scheduler/package.json ./node_modules/@hojai/internet-os-scheduler/

# Copy admin dashboard
COPY --from=builder /app/../admin-dashboard ./public

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set InternetOS port
ENV INTERNET_OS_PORT=4595
EXPOSE 4595

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:4595/health || exit 1

# Start
CMD ["node", "dist/index.js"]