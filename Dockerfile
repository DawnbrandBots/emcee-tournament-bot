ARG NODE_VERSION=14-buster
FROM node:${NODE_VERSION} as base
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn --prod

FROM base as build
RUN yarn
COPY . .
RUN yarn build

FROM base
WORKDIR /app
COPY --from=build /app/dist .
COPY --chown=node:node dbs/ ./dbs
USER node
CMD ["node", "--enable-source-maps", "--unhandled-rejections=strict", "."]
