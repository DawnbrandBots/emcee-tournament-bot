ARG NODE_VERSION=14-buster
FROM node:${NODE_VERSION} as base
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn --prod

FROM base as dev
RUN yarn

FROM dev as build
COPY . .
RUN yarn build

FROM base
LABEL org.opencontainers.image.authors bastionbotdev@gmail.com
LABEL org.opencontainers.image.source https://github.com/AlphaKretin/emcee-tournament-bot.git
LABEL org.opencontainers.image.licenses AGPL-3.0-or-later
WORKDIR /app
COPY --from=build /app/dist .
COPY --chown=node:node dbs/ ./dbs
COPY guides/ ./guides
COPY COPYING .
USER node
CMD ["node", "--enable-source-maps", "--unhandled-rejections=strict", "."]
