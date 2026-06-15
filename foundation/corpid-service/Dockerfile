FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 4702
ENV NODE_ENV=production
ENV PORT=4702
CMD ["node", "src/index.js"]
