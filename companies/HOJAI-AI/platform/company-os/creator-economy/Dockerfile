FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN npm run build || true

# Expose port
EXPOSE 4514

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4514/health || exit 1

# Start command (use ts-node for dev, or compiled JS for prod)
CMD ["node", "--loader", "ts-node/esm", "src/server.ts"]
