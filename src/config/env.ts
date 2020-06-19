import dotenv from "dotenv";
dotenv.config();

if (process.env.DISCORD_TOKEN === undefined) {
	throw new Error("Missing environment variable DISCORD_TOKEN!");
}
export const discordToken: string = process.env.DISCORD_TOKEN;
if (process.env.GITHUB_TOKEN === undefined) {
	throw new Error("Missing environment variable GITHUB_TOKEN!");
}
export const githubToken: string = process.env.GITHUB_TOKEN;
if (process.env.MONGODB_URL === undefined) {
	throw new Error("Missing environment variable MONGODB_URL!");
}
export const mongoDbUrl: string = process.env.MONGODB_URL;
