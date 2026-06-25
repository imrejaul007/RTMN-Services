# BCP Engine Dockerfile
# Built: June 25, 2026
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4298

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4298/health || exit 1

# Start command
CMD ["node", "dist/index.js"]
