# Fictional module catalog and console simulation only.
# Real RPC execution and network-target queries are unavailable.
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.js ./
USER node
EXPOSE 4567
CMD ["node", "server.js"]
