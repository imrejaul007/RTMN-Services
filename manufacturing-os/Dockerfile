FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 5150
ENV PORT=5150
CMD ["node", "src/index.js"]
