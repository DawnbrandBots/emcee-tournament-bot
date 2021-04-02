import dotenv from "dotenv";
import { Client } from "eris";

const args = process.argv.slice(2);
if (!args.length) {
	console.error("Missing guild ID arguments!");
	process.exit(1);
}

dotenv.config();
const client = new Client(`Bot ${process.env.DISCORD_TOKEN}`, { restMode: true });
(async () => {
	for (const snowflake of args) {
		try {
			await client.leaveGuild(snowflake);
		} catch (error) {
			console.error(snowflake, error);
		}
	}
})();
