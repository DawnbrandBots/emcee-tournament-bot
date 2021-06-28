import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:topcut");

const command: CommandDefinition = {
	name: "topcut",
	requiredArgs: ["id", "size"],
	executor: async (msg, args, support) => {
		const [id, sizeRaw] = args;
		const size = parseInt(sizeRaw, 10);
		if (isNaN(size) || size < 2) {
			await reply(msg, `Bad top cut size of ${sizeRaw}.`);
		}
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildID,
			TournamentStatus.COMPLETE
		);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "topcut",
				pool: tournament.players.length,
				size,
				event: "attempt"
			})
		);
		if (tournament.players.length < size) {
			await reply(msg, `**${tournament.name}** only has ${tournament.players.length} participants!`);
			return;
		}
		const top = await support.challonge.getTopCut(id, size);
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
				support.discord.getUsername(player.discordId, false),
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
		// Start the top cut tournament
		await support.challonge.startTournament(newId);
		await support.database.startTournament(newId);
		// send command guide to players
		for (const channel of tournament.publicChannels) {
			await support.discord.sendMessage(channel, support.templater.format("player", newId));
		}
		// send command guide to hosts
		for (const channel of tournament.privateChannels) {
			await support.discord.sendMessage(channel, support.templater.format("start", newId));
		}
		await reply(
			msg,
			`Top cut for **${tournament.name}** commenced on Challonge! Use \`mc!round ${newId}\` to send out pairings and start the timer for round 1.`
		);
		// start new round
	}
};

export default command;
