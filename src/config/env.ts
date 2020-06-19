import dotenv from "dotenv";
dotenv.config();

if (process.env.DISCORD_TOKEN === undefined) {
	throw new Error("Missing environment variable DISCORD_TOKEN!");
}
export const discordToken: string = process.env.DISCORD_TOKEN;
if (process.env.OCTOKIT_TOKEN === undefined) {
	throw new Error("Missing environment variable OCTOKIT_TOKEN!");
}
export const octokitToken: string = process.env.OCTOKIT_TOKEN;
if (process.env.MONGODB_URL === undefined) {
	throw new Error("Missing environment variable MONGODB_URL!");
}
export const mongoDbUrl: string = process.env.MONGODB_URL;
