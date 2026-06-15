FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY src/ ./src/

EXPOSE 5025

ENV NODE_ENV=production
ENV PORT=5025

CMD ["node", "src/index.js"]
