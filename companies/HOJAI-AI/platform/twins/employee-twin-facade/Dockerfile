# Employee Twin Facade Dockerfile
FROM node:20-alpine

LABEL maintainer="HOJAI AI"
LABEL service="employee-twin-facade"
LABEL port="4739"

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 4739

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4739/health || exit 1

CMD ["node", "dist/index.js"]
