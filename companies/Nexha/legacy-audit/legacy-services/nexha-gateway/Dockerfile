# ===========================================
# Nexha Gateway Dockerfile
# Port: 5002
# ===========================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files first
COPY package.json tsconfig.json ./

# Copy shared module from parent directory
COPY ../shared ./shared

# Install dependencies
RUN corepack enable && npm install

# Copy source
COPY src ./src

# Build
RUN npm run build

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
COPY --from=builder /app/shared ./shared

# Set ownership
RUN chown -R nexha:nexha /app

# Switch to non-root user
USER nexha

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5002/health || exit 1

# Start application
CMD ["node", "dist/index.js"]