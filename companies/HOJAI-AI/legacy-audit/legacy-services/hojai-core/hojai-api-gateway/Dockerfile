# HOJAI API Gateway Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build
RUN npm run build

# Production setup
ENV NODE_ENV=production

# Expose
EXPOSE 4500

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4500/health || exit 1

# Start
CMD ["node", "dist/index.js"]
