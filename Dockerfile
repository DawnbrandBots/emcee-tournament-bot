ARG NODE_VERSION=14-buster
FROM node:${NODE_VERSION} as build
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn --prod
COPY . .
RUN yarn build

FROM node:${NODE_VERSION}
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dbs ./dbs
COPY --from=build /app/package*.json /app/yarn.lock ./
COPY --from=build /app/dist ./
RUN chown -R node:node dbs
USER node
CMD ["node", "--enable-source-maps", "."]
