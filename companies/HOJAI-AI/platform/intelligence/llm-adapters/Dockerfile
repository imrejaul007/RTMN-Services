# LLM Adapters Library
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

ENV NODE_ENV=production

# This is a library, no server starts
CMD ["node", "-e", "console.log('LLM Adapters Library loaded')"]
