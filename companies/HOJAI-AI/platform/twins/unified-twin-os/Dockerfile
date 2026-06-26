FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3014

EXPOSE 3014

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3014/health || exit 1

CMD ["node", "src/index.js"]
