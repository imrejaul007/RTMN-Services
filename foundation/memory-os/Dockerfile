FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 4703
ENV NODE_ENV=production
ENV PORT=4703
CMD ["node", "src/index.js"]
