# [Project Ignis](https://github.com/ProjectIgnis): Emcee

![Build](https://github.com/AlphaKretin/emcee-tournament-bot/workflows/Build/badge.svg)&nbsp;
[![Coverage Status](https://coveralls.io/repos/github/AlphaKretin/emcee-tournament-bot/badge.svg?t=iUM0Et)](https://coveralls.io/github/AlphaKretin/emcee-tournament-bot)

A Discord bot to facilitate organising Yu-Gi-Oh! tournaments online and verify submitted decks. Currently uses [Challonge](https://challonge.com/).

Supports YGOPro deck files (.ydk) and `ydke://` URLs from [Project Ignis: EDOPro](https://github.com/edo9300/edopro).

## Usage

This README file details the source code of this bot. For information on how to use the bot from the perspective of a Discord user, see this repository's [wiki](https://github.com/AlphaKretin/deck-parse-bot/wiki).

## Development

Emcee is written in TypeScript and uses Eris to talk to Discord and MongoDB for persistence.
It targets Node.js 14+ and can be run with or without Docker.

1. Install Docker with Docker Compose or MongoDB.
1. Start MongoDB. You can start up just the Mongo container with `docker-compose up -d mongo`.
1. Create a `.env` file with the required environment variables defined in `/src/config/env.ts`.
    - If Emcee is in Docker, `MONGODB_URL` is not required.
    - If Emcee is outside Docker, use `MONGODB_URL=mongodb://localhost:27017/tournamentdb` or similar.
1. Start Emcee.
    - In Docker: `docker-compose up` and wait for the image to build.
    - Outside Docker: `npm ci && npm build && node dist/index.js`.

Please use Australian English spellings.

## Licence

Copyright © 2020 AlphaKretin, Kevin Lu. See COPYING for more details.

```
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
