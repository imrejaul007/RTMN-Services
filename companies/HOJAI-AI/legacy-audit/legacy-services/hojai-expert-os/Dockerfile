# ============================================================
# Hojai-Expert-Os - Production Dockerfile
# Generated: 2026-06-12
# ============================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodeapp && \
    adduser -S nodeapp -u 1001

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=nodeapp:nodeapp /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodeapp /app/package.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Set secure environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV RATE_LIMIT_WINDOW=60000
ENV RATE_LIMIT_MAX=100

# Switch to non-root user
USER nodeapp

# Expose port
EXPOSE 3000

# Health check with detailed endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]