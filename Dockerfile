# Not bookworm due to https://github.com/nodejs/node/issues/43064
ARG NODE_VERSION=20-bullseye
FROM node:${NODE_VERSION} AS base
WORKDIR /app
COPY package*.json yarn.lock ./
RUN cat /etc/os-release /etc/debian_version && node --version && yarn --prod

FROM base AS dev
RUN yarn

FROM dev AS build
COPY . .
RUN yarn build

FROM base
ARG EMCEE_REVISION
LABEL org.opencontainers.image.title="Emcee Discord bot"
LABEL org.opencontainers.image.authors=bastionbotdev@gmail.com
LABEL org.opencontainers.image.source=https://github.com/DawnbrandBots/emcee-tournament-bot
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later
LABEL org.opencontainers.image.revision=${EMCEE_REVISION}
ENV EMCEE_REVISION=${EMCEE_REVISION}
WORKDIR /app
COPY --from=build /app/dist .
COPY --chown=node:node dbs/ ./dbs
COPY guides/ ./guides
COPY COPYING .
USER node
CMD ["node", "--enable-source-maps", "."]
