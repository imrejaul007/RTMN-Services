# nexha-commerce-runtime — Docker build (pure JS, no build step)
# Build: docker build -t nexha-commerce-runtime:latest .
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER nexha
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4364/health || exit 1
EXPOSE 4364
CMD ["node", "src/index.js"]
