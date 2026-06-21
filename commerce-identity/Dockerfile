FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

CMD ["node", "dist/index.js"]
