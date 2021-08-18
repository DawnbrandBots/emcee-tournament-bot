import dotenv from "dotenv";
import fetch from "node-fetch";

const args = process.argv.slice(2);
if (!args.length) {
	console.error("Missing guild ID arguments!");
	process.exit(1);
}

dotenv.config();
(async () => {
	for (const snowflake of args) {
		try {
			// https://discord.com/developers/docs/resources/user#leave-guild
			const response = await fetch(`https://discord.com/api/users/@me/guilds/${snowflake}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bot ${process.env.DISCORD_TOKEN}`
				}
			});
			if (response.status !== 204) {
				console.error(snowflake, `API endpoint returned unexpected status ${response.status}`);
			}
		} catch (error) {
			console.error(snowflake, error);
		}
	}
})();
