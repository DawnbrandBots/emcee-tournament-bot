import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { send } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:finish");

const command: CommandDefinition = {
	name: "finish",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, earlyArg] = args;
		const early = !!earlyArg;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "finish",
				event: "attempt"
			})
		);
		await msg.reply(":hammer: Working…");
		try {
			const tournament = await support.database.getTournament(id, TournamentStatus.IPR);
			if (!early) {
				await support.challonge.finishTournament(id);
			} // TODO: else edit description to say finished?
			const webTourn = await support.challonge.getTournament(id);
			await support.timeWizard.cancel(tournament.id);
			await support.database.finishTournament(id);
			const role = await support.participantRole.get(tournament);
			for (const channel of tournament.publicChannels) {
				await send(
					msg.client,
					channel,
					`${tournament.name} has concluded! Thank you all for playing! <@&${role}>\nResults: ${webTourn.url}`
				);
			}
			await support.participantRole.delete(tournament);
		} catch (e) {
			// TODO: filter specifically for challonge error with finalise
			if (!early) {
				await msg.reply(
					`**${tournament.name}** is not finished. If you intend to end it early, use \`mc!finish ${id}|early\`.`
				);
				return;
			}
			throw e;
		}
		support.scores.delete(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "finish",
				event: "success"
			})
		);
		await msg.reply(`**${tournament.name}** successfully finished.`);
	}
};

export default command;
