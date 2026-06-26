FROM node:20-alpine AS base
WORKDIR /app

# Install all deps (including dev) for lint/test stages
FROM base AS deps
COPY package*.json ./
RUN npm install

# Production image — only production deps
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Build stage (for future TypeScript compilation)
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run check

# Production runtime
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4254
ENV POLICYOS_REQUIRE_AUTH=true
ENV POLICYOS_EVAL_LIMIT=20
ENV POLICYOS_WRITE_LIMIT=20

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
USER appuser

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/data ./data

EXPOSE 4254

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4254/health || exit 1

CMD ["node", "src/index.js"]
