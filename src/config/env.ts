import dotenv from "dotenv";
dotenv.config();

function assertEnv(envvar: string): string {
	if (process.env[envvar] === undefined) {
		throw new Error(`Missing environment variable ${envvar}`);
	}
	return process.env[envvar] as string;
}

export const discordToken: string      = assertEnv("DISCORD_TOKEN");
export const octokitToken: string      = assertEnv("OCTOKIT_TOKEN");
export const challongeUsername: string = assertEnv("CHALLONGE_USERNAME");
export const challongeToken: string    = assertEnv("CHALLONGE_TOKEN");
export const postgresqlUrl: string     = assertEnv("POSTGRESQL_URL");
