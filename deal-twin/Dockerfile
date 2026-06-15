FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install && npm run build
COPY src/ ./src/ && cp -r src/* ./
EXPOSE 3014
CMD ["node", "dist/index.js"]
