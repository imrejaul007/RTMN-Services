FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY src/ ./src/

EXPOSE 4251

ENV NODE_ENV=production
ENV PORT=4251

CMD ["node", "src/index.js"]
