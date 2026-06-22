FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build
RUN mv dist/* . 2>/dev/null || true
EXPOSE ${PORT}
CMD ["node", "index.js"]
