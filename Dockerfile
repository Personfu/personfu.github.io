FROM node:20-alpine
WORKDIR /app
COPY multiplayer-server/package.json ./
RUN npm install --production
COPY multiplayer-server/ ./
EXPOSE 8787
CMD ["node", "server.js"]
