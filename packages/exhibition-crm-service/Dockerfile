# Base Dockerfile for Exhibition Services
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source
COPY src/ ./src/

# Expose port (set via PORT env)
EXPOSE ${PORT:-5041}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5041}/health/live || exit 1

# Start
CMD ["node", "src/index.js"]
