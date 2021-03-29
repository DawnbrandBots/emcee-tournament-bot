# [Project Ignis](https://github.com/ProjectIgnis): Emcee

<!-- Unfortunately, GitHub Markdown sanitizes style attributes, so we will have to use a deprecated HTML attribute. -->
[<img src="https://cdn.discordapp.com/avatars/691882968809209917/1ffd7675f6fb2a4c21b1b356b7856279.png" alt="Emcee avatar" align="right" />](https://yugipedia.com/wiki/MC)

![Build](https://github.com/AlphaKretin/emcee-tournament-bot/workflows/Build/badge.svg)&nbsp;
[![Coverage Status](https://coveralls.io/repos/github/AlphaKretin/emcee-tournament-bot/badge.svg?t=iUM0Et)](https://coveralls.io/github/AlphaKretin/emcee-tournament-bot)

A Discord bot to facilitate organising Yu-Gi-Oh! tournaments online using [Challonge](https://challonge.com/) and verify submitted decks.
Supports YGOPro deck files (.ydk) and `ydke://` URLs from [Project Ignis: EDOPro](https://github.com/edo9300/edopro) and [YGOPRODECK](https://ygoprodeck.com/).

Emcee automates the tedious tasks of the sign-up process, deck checks, and tracking match scores for tournament hosts.
This frees up hosts to focus on the overall flow of the tournament and any disputes instead of a lot of repetitive work.
It currently supports hosting Swiss tournaments of up to 256 participants (a limitation of Challonge's [standard tier](https://challonge.com/pricing))
with an optional single-elimination top cut of configurable size.

Currently in use in alpha (no pun intended) for the [Chalislime Monthly](https://youtu.be/iehvqngGxs0) tournament series.
Thanks to [Joseph Rothschild](https://www.youtube.com/c/MBTYuGiOh) aka [MBT](https://www.twitch.tv/mbtyugioh) for
sponsoring the development of Emcee. Open beta ETA: April 2021.

## Discord permissions

Please make sure you use an invite link that automatically grants the following permissions.

- Manage Roles: Emcee creates a role to designate Tournament Organisers upon joining a server and will create and delete participant roles for each tournament.
- Send Messages
- Embed Links: Emcee sends deck profiles in the form of a Discord rich embed.
- Attach Files: Emcee attaches a YDK file to deck profiles.
- Read Message History
- Add Reactions: Emcee uses a "reaction button" for tournament registration.

Privileged gateway intents required:

- Server members intent: Emcee removes participants from tournaments if they leave the server.

## Usage

After Emcee joins your server, you can ping it as a sanity check to confirm that it is working.
You can set permissions for Emcee so it is allowed to access only specific channels and locked out of the rest.
If you do not want people to use Emcee in a channel, deny Emcee access to the channel.
However, if Emcee does have access to a channel, make sure it has the full range of permissions listed above.

When Emcee joins your server, it will automatically create an `MC-TO` role to identify tournament hosts.
Give this role to anybody who needs to be able to control Emcee to host tournament. Only users with the
role will be allowed to list all tournaments on the server and create new ones. For developers, the name
of the role can be changed by the `EMCEE_DEFAULT_TO_ROLE` environment variable. In the future, the name
and colour of this role will be configurable per server. For now, please do not delete the role,
rename the role, or create another role with the same name &mdash; Emcee will lose track of the role and
recreate it, or worse, identify authorised hosts with the incorrect role.

The default prefix for all Emcee commands is `mc!`. For developers, this can be changed by the `EMCEE_DEFAULT_PREFIX`
environment variable. In the future, this will also be configurable per server. We may add support for
Discord slash commands in future when [Eris](https://github.com/abalabahaha/eris), our underlying library
for interfacing with Discord, supports it.

- [Commands for tournament hosts](https://github.com/AlphaKretin/emcee-tournament-bot/blob/master/docs/usage-organiser.md)
- [Commands for participants](https://github.com/AlphaKretin/emcee-tournament-bot/blob/master/docs/usage-participant.md)

## Development

Emcee is written in TypeScript. It targets Node.js 14+ and can be run with or without Docker.
It uses Eris to talk to Discord and PostgreSQL for persistence.


1. Install Docker with Docker Compose, or install PostgreSQL.
1. Start Postgres. You can start up just the Postgres container with `docker-compose up -d postgres`.
1. Create a `.env` file with the required credentials and configuration. Examples below:
    - In Docker:

        ```
        POSTGRES_VERSION=13-alpine
        POSTGRES_HOST_PORT=127.0.0.1:5432
        POSTGRES_USER=
        POSTGRES_PASSWORD=
        POSTGRES_DB=
        DISCORD_TOKEN=
        CHALLONGE_USERNAME=
        CHALLONGE_TOKEN=
        OCTOKIT_TOKEN=
        EMCEE_DEFAULT_PREFIX=mc!
        EMCEE_DEFAULT_TO_ROLE=MC-TO
        ```

    - Outside Docker:

        ```
        NODE_ENV=development
        DEBUG=emcee:*
        POSTGRESQL_URL=postgresql://USER:PASSWORD@localhost:5432/DBNAME
        DISCORD_TOKEN=
        CHALLONGE_USERNAME=
        CHALLONGE_TOKEN=
        OCTOKIT_TOKEN=
        EMCEE_DEFAULT_PREFIX=mc!
        EMCEE_DEFAULT_TO_ROLE=MC-TO
        ```

1. Start Emcee.
    - In Docker: `docker-compose up --build` and wait for the image to build.
    - Outside Docker: `yarn && yarn build && node --enable-source-maps dist`.

Please use Australian English spellings.

## Licence

Copyright © 2020&ndash;2021 Luna Brand, Kevin Lu.
See [COPYING](https://github.com/AlphaKretin/emcee-tournament-bot/blob/master/COPYING) for more details.

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
