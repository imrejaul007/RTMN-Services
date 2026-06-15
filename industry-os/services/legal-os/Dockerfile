FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 5035
ENV NODE_ENV=production
ENV PORT=5035
CMD ["node", "src/index.js"]
