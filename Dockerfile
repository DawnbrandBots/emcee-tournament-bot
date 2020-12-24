ARG NODE_VERSION=14-buster
FROM node:${NODE_VERSION} as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dbs ./dbs
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./
RUN mkdir logs && touch ormlogs.log && chown -R node:node dbs logs ormlogs.log
USER node
CMD ["node", "--enable-source-maps", "."]
