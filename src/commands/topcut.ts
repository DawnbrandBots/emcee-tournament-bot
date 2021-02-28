import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:topcut");

const command: CommandDefinition = {
	name: "topcut",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, TournamentStatus.COMPLETE);
		if (tournament.players.length > 8) {
			const top = await support.challonge.getTopCut(id, 8);
			const [newId] = await support.tournamentManager.createTournament(
				tournament.hosts[0], // tournament cannot have 0 hosts by addition on creation and guard on removal
				tournament.server,
				`${tournament.name} Top Cut`,
				`Top Cut for ${tournament.name} (https://challonge.com/${id})`,
				true
			);

			if (tournament.hosts.length > 1) {
				for (const host of tournament.hosts.slice(1)) {
					await support.database.addHost(newId, host);
				}
			}

			const newTournament = await support.database.getTournament(newId);
			for (const player of top) {
				const challongeId = await support.challonge.registerPlayer(
					newId,
					support.discord.getUsername(player.discordId),
					player.discordId
				);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const deck = tournament.findPlayer(player.discordId)!.deck;
				await support.database.confirmPlayer(newId, player.discordId, challongeId, deck);
				await support.participantRole.grant(player.discordId, newTournament).catch(logger.error);
			}
			for (const channel of tournament.publicChannels) {
				await support.database.addAnnouncementChannel(newId, channel, "public");
			}
			for (const channel of tournament.privateChannels) {
				await support.database.addAnnouncementChannel(newId, channel, "private");
			}
			await support.tournamentManager.startTournament(newId);
		} else {
			await reply(msg, `**${tournament.name}** only has ${tournament.players.length} participants!`);
		}
	}
};

export default command;
