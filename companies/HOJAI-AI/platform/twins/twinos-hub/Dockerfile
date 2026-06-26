# TwinOS Hub - Digital Twin Orchestrator
# Multi-stage build for optimized production image

# ============ Build Stage ============
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for testing)
RUN npm ci

# Copy source
COPY src/ ./src/
COPY __tests__/ ./__tests__/
COPY vitest.config.js ./

# Run tests during build
RUN npm test

# ============ Production Stage ============
FROM node:20-alpine AS production

# Add labels
LABEL maintainer="HOJAI AI <dev@hojai.ai>"
LABEL description="RTMN TwinOS Hub - Digital Twin Orchestrator v3.1"
LABEL version="3.1.0"

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled source (or just use original since no compile step)
COPY src/ ./src/

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment defaults
ENV NODE_ENV=production
ENV PORT=4705
ENV SERVICE_NAME=twinos-hub
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4705/health || exit 1

# Expose port
EXPOSE 4705

# Start command
CMD ["node", "src/index.js"]
