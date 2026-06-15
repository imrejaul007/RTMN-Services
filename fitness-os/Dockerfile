FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 5110
ENV PORT=5110
CMD ["node", "src/index.js"]
