# PolicyOS Dockerfile — Phase F.1
# ----------------------------------------------------------------------------
# Builds and runs PolicyOS (port 4254) in a production container.
# The dev stack starts it via scripts/dev-stack.sh; this Dockerfile is for
# the docker-compose.dev.yml integration so `docker compose up` brings up
# the foundation alongside SUTAR + Nexha.
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

# Persistent state lives in /data
RUN mkdir -p /data/policy-os && chown -R node:node /data
VOLUME ["/data"]
ENV NODE_ENV=production
ENV PORT=4254
ENV DATA_DIR=/data

USER node
EXPOSE 4254
HEALTHCHECK --interval=15s --timeout=5s --retries=6 \
  CMD wget -qO- http://localhost:4254/health || exit 1

CMD ["node", "src/index.js"]