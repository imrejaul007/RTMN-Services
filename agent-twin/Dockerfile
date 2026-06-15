FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install && npm run build

COPY src/ ./src/
COPY dist/ ./dist/

EXPOSE 3011

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
