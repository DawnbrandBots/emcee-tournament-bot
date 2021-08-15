import { EmbedField, MessageEmbed } from "discord.js";
import { CommandDefinition } from "../Command";
import { ChallongeTournament } from "../database/orm";
import { reply } from "../util/discord";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:info");

export function createTournamentEmbed(tournament: ChallongeTournament): MessageEmbed {
	const fields: EmbedField[] = [
		{ name: ":ticket: Capacity", value: `${tournament.participantLimit || 256}`, inline: true },
		{
			name: ":tickets: Registered",
			value: `**${tournament.confirmed.length}** participants`,
			inline: true
		},
		{ name: ":notepad_spiral: Format", value: tournament.format, inline: true },
		{ name: ":hourglass: Status", value: tournament.status, inline: true }
	];
	const byes = tournament.confirmed
		.filter(p => p.hasBye)
		.map(p => `<@${p.discordId}>`)
		.join(" ");
	if (byes) {
		fields.push({ name: ":sunglasses: Round 1 byes", value: byes, inline: true });
	}
	const hosts = tournament.hosts.map(snowflake => `<@${snowflake}>`).join(" ");
	fields.push({ name: ":smile: Hosts", value: hosts, inline: true });
	return new MessageEmbed()
		.setURL(`https://challonge.com/${tournament.tournamentId}`)
		.setTitle(`**${tournament.name}**`)
		.setDescription(tournament.description)
		.setFields(fields)
		.setFooter("Tournament details as of request time");
}

const command: CommandDefinition = {
	name: "info",
	requiredArgs: ["id"],
	executor: async (msg, args) => {
		const [id] = args;
		if (!msg.guildId) {
			throw new UserError("This can only be used in a server!");
		}
		const tournament = await ChallongeTournament.findOne({
			tournamentId: id,
			owningDiscordServer: msg.guildId
		});
		if (tournament) {
			logger.verbose(
				JSON.stringify({
					channel: msg.channel.id,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "info",
					event: "found"
				})
			);
			const embed = createTournamentEmbed(tournament);
			await reply(msg, {
				embeds: [embed],
				allowedMentions: { users: [] }
			});
		} else {
			logger.verbose(
				JSON.stringify({
					channel: msg.channel.id,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "info",
					event: "404"
				})
			);
			await reply(msg, "No matching tournament in this server.");
		}
	}
};

export default command;
