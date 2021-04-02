# Command-line options and utilities

Some administrative functions useful to the operation of Emcee or utility scripts
that may help in development are located in `src/cli`. They may be executed with
`ts-node` or after transpiling to JavaScript.

You can use the correspond package script, i.e., `yarn COMMAND ARGUMENTS` outside
of Docker and `yarn COMMAND:docker ARGUMENTS` inside a Docker container.

## delete
```
yarn delete challonge_id1 challonge_id2
```

Deletes the corresponding Challonge tournaments with the specified identifiers,
using the same Challonge API credentials as Emcee.

## leave
```
yarn leave guild_snowflake1 guild_snowflake2
```

Instructs Emcee to leave the servers identified by the specified snowflakes.
This is a REST API call to Discord; Emcee does not need to be online.
