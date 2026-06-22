# GENIE Dashboard Service
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4701

EXPOSE 4701

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4701/health || exit 1

CMD ["node", "dist/index.js"]
