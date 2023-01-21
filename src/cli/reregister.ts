import { Client } from "discord.js";
import dotenv from "dotenv";
import { getConnection } from "typeorm";
import { ConfirmedParticipant, initializeConnection } from "../database/orm";
import { WebsiteWrapperChallonge } from "../website/challonge";
dotenv.config();

const args = process.argv.slice(2);
if (!args.length) {
	console.error("Missing target tournament argument!");
	process.exit(1);
}

const challonge = new WebsiteWrapperChallonge(`${process.env.CHALLONGE_USERNAME}`, `${process.env.CHALLONGE_TOKEN}`);

const client = new Client({ intents: [] });

(async () => {
	await initializeConnection(`${process.env.POSTGRESQL_URL}`);
	await client.login();
	const participants = await ConfirmedParticipant.find({ where: { tournamentId: args[0] } });
	console.log(`${participants.length} participants to process.`);
	for (const participant of participants) {
		console.group(`Processing <@${participant.discordId}>...`);
		const user = await client.users.fetch(participant.discordId);
		console.log(`<@${participant.discordId}> is ${user.tag}`);
		const challongeId = await challonge.registerPlayer(args[0], user.tag, participant.discordId);
		console.log(`<@${participant.discordId}> re-registered as ${challongeId}`);
		participant.challongeId = challongeId;
		await participant.save();
		console.groupEnd();
	}
	client.destroy();
	await getConnection().close();
})();
