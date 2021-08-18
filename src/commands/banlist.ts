import { createHash } from "crypto";
import { MessageAttachment } from "discord.js";
import fetch from "node-fetch";
import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:banlist");

async function download(attach: MessageAttachment): Promise<unknown> {
	try {
		const response = await fetch(attach.url);
		const json = await response.json();
		return json;
	} catch (error) {
		logger.info(`Downloading and parsing ${attach.url}`, error);
		throw new UserError("Failed to parse JSON file!");
	}
}

const command: CommandDefinition = {
	name: "banlist",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildId,
			TournamentStatus.PREPARING
		);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "banlist",
				event: "attempt",
				attachments: msg.attachments.size,
				players: tournament.players.length
			})
		);
		if (msg.attachments.size) {
			if (tournament.players.length) {
				await msg.reply(
					`Players have already been confirmed for **${tournament.name}**. Please drop them first if you wish to change the card pool.`
				);
				return;
			}
			const attachment = msg.attachments.first();
			// checking not-null should be redundant given size check but serves as type guard
			if (msg.attachments.size === 1 && attachment && attachment.name?.endsWith(".json")) {
				// cap filesize for security at 0.5 MB
				if (attachment.size > 512 * 1024) {
					logger.notify(
						`Potential abuse warning! ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) uploaded oversized card pool JSON "${attachment.name}" (${attachment.size}B).`
					);
					throw new UserError("JSON file too large! Please try again with a smaller file.");
				}
				const raw = await download(attachment);
				logger.verbose(
					JSON.stringify({
						channel: msg.channelId,
						message: msg.id,
						user: msg.author.id,
						tournament: id,
						command: "banlist",
						event: "download",
						attachment: attachment.name
					})
				);
				try {
					await support.database.setAllowVector(id, raw);
					logger.verbose(
						JSON.stringify({
							channel: msg.channelId,
							message: msg.id,
							user: msg.author.id,
							tournament: id,
							command: "banlist",
							event: "success"
						})
					);
					await msg.reply(`Set the card pool for **${tournament.name}**.`);
				} catch (error) {
					logger.info(
						JSON.stringify({
							channel: msg.channelId,
							message: msg.id,
							user: msg.author.id,
							tournament: id,
							command: "banlist",
							event: "save fail"
						}),
						error
					);
					await msg.reply(
						error instanceof TypeError ? error.message : "Failed to save card pool! Please try again later."
					);
				}
			} else {
				logger.verbose(
					JSON.stringify({
						channel: msg.channelId,
						message: msg.id,
						user: msg.author.id,
						tournament: id,
						command: "banlist",
						event: "bad upload"
					})
				);
				await msg.reply(
					`Please provide exactly 1 JSON file to use for **${tournament.name}**'s allowed card pool.`
				);
			}
		} else {
			// Note: property order is not deterministic, so the hash may differ for identical vectors. To fix later.
			// May be an expensive operation worth caching
			const file = JSON.stringify(
				Object.fromEntries(tournament.allowVector || support.decks.tcgAllowVector),
				null,
				4
			);
			const hash = createHash("sha256").update(file).digest("hex");
			logger.verbose(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "banlist",
					event: "success",
					isDefault: !tournament.allowVector,
					hash
				})
			);
			const memo = tournament.allowVector
				? `Here is the custom allowed card pool for **${tournament.name}** in vector form.\nSHA256: \`${hash}\``
				: `This is the _default_ allowed card pool in vector form.\nSHA256: \`${hash}\``;
			await msg.reply({ content: memo, files: [new MessageAttachment(file, `${id}.allowVector.json`)] });
		}
	}
};

export default command;
