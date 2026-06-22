# REZ Platform Admin - Dockerfile

FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/.next/standalone .next/static

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
