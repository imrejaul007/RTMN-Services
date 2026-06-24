FROM node:20-alpine
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN npm install --save-dev typescript@^5.3.3 && npx tsc && npm prune --omit=dev
EXPOSE 4293
ENV PORT=4293
CMD ["node", "dist/index.js"]