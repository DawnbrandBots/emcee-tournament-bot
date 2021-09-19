import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { Participant } from "../database/orm";
import { dropPlayerChallonge } from "../drop";
import { parseUserMention, removeReaction, send } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcedrop");

const command: CommandDefinition = {
	name: "forcedrop",
	requiredArgs: ["id", "who"],
	executor: async (msg, args, support) => {
		const [id, who] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		const player = parseUserMention(who) || who;
		function log(payload: Record<string, unknown>): void {
			logger.verbose(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "forcedrop",
					...payload
				})
			);
		}
		log({ player, event: "attempt" });
		const participant = await Participant.findOne({ tournamentId: id, discordId: player });
		const username = await support.discord.getRESTUsername(player, true);
		log({ player, exists: !!participant, challongeId: participant?.confirmed?.challongeId, username });
		const name = username ? `<@${player}> (${username})` : who;
		if (!participant) {
			await msg.reply(`${name} not found in **${tournament.name}**.`);
			return;
		}
		if (tournament.status === TournamentStatus.COMPLETE) {
			log({ player, event: "already complete" });
			await msg.reply(`**${tournament.name}** has already concluded!`);
			return;
		}
		if (participant.confirmed) {
			if (
				await dropPlayerChallonge(
					id,
					tournament.privateChannels,
					tournament.status,
					participant.confirmed.challongeId,
					who,
					log,
					support.discord,
					support.challonge,
					support.database
				)
			) {
				try {
					await support.participantRole.ungrant(player, tournament);
				} catch (error) {
					logger.info(error);
					await msg
						.reply(`Failed to remove **${tournament.name}** participant role from ${name}.`)
						.catch(logger.error);
				}
			} else {
				await msg.reply(
					"Something went wrong with Challonge. Please check private channels for problems and try again later."
				);
				return;
			}
		}
		const confirmed = !!participant.confirmed;
		try {
			await participant.remove();
		} catch (error) {
			logger.error(error);
			await msg.reply(
				"Something went wrong with Emcee's database. Please report this to developers as this may not be immediately recoverable."
			);
			return;
		}
		// Notify relevant parties as long as the participant existed
		await support.discord
			.sendDirectMessage(player, `You have been dropped from **${tournament.name}** by the hosts.`)
			.catch(logger.info);
		for (const channel of tournament.privateChannels) {
			await send(msg.client, channel, `${name} has been forcefully dropped from **${tournament.name}**.`).catch(
				logger.error
			);
		}
		await msg.reply(
			confirmed
				? `${name} successfully dropped from **${tournament.name}**.`
				: `${name} was pending and dropped from **${tournament.name}**.`
		);
		log({ player, event: "success" });
		if (participant.tournament.status === TournamentStatus.PREPARING) {
			const messages = await support.database.getRegisterMessages(id);
			for (const m of messages) {
				await removeReaction(msg.client, m.channelId, m.messageId, "✅", player).catch(logger.info);
			}
		}
	}
};

export default command;
