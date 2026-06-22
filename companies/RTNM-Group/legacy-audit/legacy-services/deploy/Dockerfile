# RTNM-Group Docker Configuration
# Multi-stage build for optimized production images

# ============================================
# Base Image
# ============================================
FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

# ============================================
# Dependencies Stage
# ============================================
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# ============================================
# Dev Dependencies Stage
# ============================================
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

# ============================================
# Builder Stage
# ============================================
FROM dev-deps AS builder
COPY . .
RUN npm run build

# ============================================
# Production Image - Identity Service
# ============================================
FROM base AS production-identity
ENV NODE_ENV=production
ENV PORT=3003

# Copy only production dependencies and built files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder ./dist ./dist
COPY package*.json ./

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# ============================================
# Production Image - Access Control Service
# ============================================
FROM base AS production-access-control
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder ./dist ./dist
COPY package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# ============================================
# Production Image - Capital Service
# ============================================
FROM base AS production-capital
ENV NODE_ENV=production
ENV PORT=3005

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder ./dist ./dist
COPY package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# ============================================
# Production Image - BNPL Service
# ============================================
FROM base AS production-bnpl
ENV NODE_ENV=production
ENV PORT=3080

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder ./dist ./dist
COPY package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3080/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
