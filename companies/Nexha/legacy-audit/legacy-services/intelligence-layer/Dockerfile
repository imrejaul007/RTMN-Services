# ===========================================
# NeXha Intelligence Layer Dockerfile
# Port: 4350
# ===========================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files for monorepo dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared ./shared

# Install dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source code
COPY intelligence-layer/src ./src

# Build
RUN pnpm --filter @rez/nexha-intelligence build

# ===========================================
# Production stage
# ===========================================
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set ownership
RUN chown -R nexha:nexha /app

# Switch to non-root user
USER nexha

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]