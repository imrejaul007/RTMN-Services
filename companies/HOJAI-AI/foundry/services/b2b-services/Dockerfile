FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production
COPY src ./src
EXPOSE 4772
CMD ["node", "src/index.js"]
