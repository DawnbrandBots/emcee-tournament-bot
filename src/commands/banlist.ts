import { createHash } from "crypto";
import { Attachment } from "eris";
import fetch from "node-fetch";
import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { reply } from "../util/discord";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:banlist");

async function download(attach: Attachment): Promise<unknown> {
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
			msg.guildID,
			TournamentStatus.PREPARING
		);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "banlist",
				event: "attempt",
				attachments: msg.attachments.length,
				players: tournament.players.length
			})
		);
		if (msg.attachments.length) {
			if (tournament.players.length) {
				await reply(
					msg,
					`Players have already been confirmed for **${tournament.name}**. Please drop them first if you wish to change the card pool.`
				);
				return;
			}
			if (msg.attachments.length === 1 && msg.attachments[0].filename.endsWith(".json")) {
				// cap filesize for security at 0.5 MB
				if (msg.attachments[0].size > 512 * 1024) {
					logger.notify(
						`Potential abuse warning! ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) uploaded oversized card pool JSON "${msg.attachments[0].filename}" (${msg.attachments[0].size}B).`
					);
					throw new UserError("JSON file too large! Please try again with a smaller file.");
				}
				const raw = await download(msg.attachments[0]);
				logger.verbose(
					JSON.stringify({
						channel: msg.channel.id,
						message: msg.id,
						user: msg.author.id,
						tournament: id,
						command: "banlist",
						event: "download",
						attachment: msg.attachments[0].filename
					})
				);
				try {
					await support.database.setAllowVector(id, raw);
					logger.verbose(
						JSON.stringify({
							channel: msg.channel.id,
							message: msg.id,
							user: msg.author.id,
							tournament: id,
							command: "banlist",
							event: "success"
						})
					);
					await reply(msg, `Set the card pool for **${tournament.name}**.`);
				} catch (error) {
					logger.info(
						JSON.stringify({
							channel: msg.channel.id,
							message: msg.id,
							user: msg.author.id,
							tournament: id,
							command: "banlist",
							event: "save fail"
						}),
						error
					);
					await reply(
						msg,
						error instanceof TypeError ? error.message : "Failed to save card pool! Please try again later."
					);
				}
			} else {
				logger.verbose(
					JSON.stringify({
						channel: msg.channel.id,
						message: msg.id,
						user: msg.author.id,
						tournament: id,
						command: "banlist",
						event: "bad upload"
					})
				);
				await reply(
					msg,
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
					channel: msg.channel.id,
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
			await reply(msg, memo, { file, name: `${id}.allowVector.json` });
		}
	}
};

export default command;
