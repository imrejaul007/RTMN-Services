# ===========================================
# NextaBizz - Multi-stage Dockerfile
# ===========================================
# Production: docker build -t nextabizz . && docker run -p 3000:3000 nextabizz
# ===========================================

# ── Builder Stage ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Build all services
RUN pnpm build

# ── Production Stage ───────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for health check
RUN apk add --no-cache curl tini

# Create non-root user
RUN addgroup -g 1001 -S nextjs && \
    adduser -S nextjs -u 1001

# Copy built artifacts from builder
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

# Copy services
COPY --from=builder /app/services/auto-rfq ./services/auto-rfq
COPY --from=builder /app/services/scoring-engine ./services/scoring-engine
COPY --from=builder /app/services/reorder-engine ./services/reorder-engine
COPY --from=builder /app/services/payment-settlement ./services/payment-settlement

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]