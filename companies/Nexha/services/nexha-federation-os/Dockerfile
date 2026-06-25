FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build && rm -rf src/

RUN addgroup -g 1001 -S nexha && adduser -S nexha -u 1001
RUN chown -R nexha:nexha /app
USER nexha

EXPOSE 4273

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:4273/health || exit 1

CMD ["node", "dist/index.js"]
