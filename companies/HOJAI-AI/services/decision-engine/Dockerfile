FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 4240
ENV NODE_ENV=production
ENV PORT=4240
CMD ["node", "src/index.js"]
