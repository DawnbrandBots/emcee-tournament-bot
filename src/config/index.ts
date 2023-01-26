import dotenv from "dotenv";
dotenv.config();

function assertEnv(envvar: string): string {
	const value = process.env[envvar];
	if (value === undefined) {
		throw new Error(`Missing environment variable ${envvar}`);
	}
	return value;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/explicit-function-return-type
export function getConfig() {
	return {
		challongeUsername: assertEnv("CHALLONGE_USERNAME"),
		challongeToken: assertEnv("CHALLONGE_TOKEN"),
		defaultPrefix: assertEnv("EMCEE_DEFAULT_PREFIX"),
		defaultTORole: assertEnv("EMCEE_DEFAULT_TO_ROLE"),
		discordToken: assertEnv("DISCORD_TOKEN"),
		octokitToken: assertEnv("OCTOKIT_TOKEN"),
		postgresqlUrl: assertEnv("POSTGRESQL_URL")
	};
}

export const helpMessage = `Emcee's documentation can be found at https://github.com/DawnbrandBots/emcee-tournament-bot/blob/master/README.md.\nRevision: **${process.env.EMCEE_REVISION}**`;
