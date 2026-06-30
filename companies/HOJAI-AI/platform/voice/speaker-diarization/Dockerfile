# Speaker Diarization Service
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Environment
ENV NODE_ENV=production
ENV PORT=4894

# Expose
EXPOSE 4894

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4894/health || exit 1

# Start
CMD ["node", "src/index.js"]
