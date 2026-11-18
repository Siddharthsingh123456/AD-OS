# Production image: builds the React client, then serves it and the API from one small Node process.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY client ./client
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production PORT=5000
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY --from=build /app/client/dist ./client/dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "server/src/index.js"]
