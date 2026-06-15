FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY src/ ./src/

EXPOSE 5050

ENV NODE_ENV=production
ENV PORT=5050

CMD ["node", "src/index.js"]
