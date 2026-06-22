# SkillOS Dockerfile — Phase F.1
# ----------------------------------------------------------------------------
# Builds and runs SkillOS (port 4743) in a production container.
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

RUN mkdir -p /data/skill-os && chown -R node:node /data
VOLUME ["/data"]
ENV NODE_ENV=production
ENV PORT=4743

USER node
EXPOSE 4743
HEALTHCHECK --interval=15s --timeout=5s --retries=6 \
  CMD wget -qO- http://localhost:4743/health || exit 1

CMD ["node", "src/index.js"]