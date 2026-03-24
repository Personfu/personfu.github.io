FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8787
EXPOSE ${PORT}
CMD ["npm", "start"]
