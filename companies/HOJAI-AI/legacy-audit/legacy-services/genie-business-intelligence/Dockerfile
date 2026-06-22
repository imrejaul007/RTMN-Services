# GENIE Business Intelligence Service
# Version: 1.0.0
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist ./dist
COPY src ./src

# Set environment
ENV NODE_ENV=production
ENV PORT=4725

# Expose port
EXPOSE 4725

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4725/health || exit 1

# Start service
CMD ["node", "dist/index.js"]
