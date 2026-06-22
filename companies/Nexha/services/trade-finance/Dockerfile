FROM node:20-alpine
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install --omit=dev=false
COPY src ./src
RUN npx tsc
EXPOSE 4340
CMD ["node", "dist/index.js"]Node-alpine base with TypeScript build