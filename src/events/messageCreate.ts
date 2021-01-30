import { Client, GuildChannel, Message, MessageContent, MessageFile } from "eris";
import { Command, CommandDefinition, CommandSupport } from "../Command";

export interface DiscordAttachmentIn {
	filename: string;
	url: string;
}

export interface DiscordAttachmentOut {
	filename: string;
	contents: string;
}

export interface DiscordEmbed {
	title: string;
	fields: {
		name: string;
		value: string;
	}[];
}

export type DiscordMessageOut = string | DiscordEmbed;

export interface DiscordMessageIn {
	secretOriginalMessage: Message; // remove when refactor complete
	id: string;
	content: string;
	attachments: DiscordAttachmentIn[];
	author: string;
	channelId: string;
	serverId: string;
	reply: (msg: DiscordMessageOut, file?: DiscordAttachmentOut) => Promise<void>;
	react: (emoji: string) => Promise<void>;
	edit: (newMsg: DiscordMessageOut) => Promise<void>;
}

function unwrapMessageOut(msg: DiscordMessageOut): MessageContent {
	if (typeof msg === "string") {
		return msg;
	}
	// else embed
	return { embed: msg };
}

function unwrapFileOut(file?: DiscordAttachmentOut): MessageFile | undefined {
	return file ? { file: file.contents, name: file.filename } : undefined;
}

export function wrapMessageIn(msg: Message): DiscordMessageIn {
	const channel = msg.channel;
	const guildId = channel instanceof GuildChannel ? channel.guild.id : "private";
	return {
		secretOriginalMessage: msg, // remove when refactor complete
		id: msg.id,
		attachments: msg.attachments,
		content: msg.content,
		author: msg.author.id,
		channelId: channel.id,
		serverId: guildId,
		reply: async (out: DiscordMessageOut, file?: DiscordAttachmentOut): Promise<void> => {
			await msg.channel.createMessage(unwrapMessageOut(out), unwrapFileOut(file));
		},
		react: async (emoji: string): Promise<void> => {
			await msg.addReaction(emoji);
		},
		edit: async (newMsg: DiscordMessageOut): Promise<void> => {
			await msg.edit(unwrapMessageOut(newMsg));
		}
	};
}

export function makeHandler(
	bot: Client,
	prefix: string,
	commands: Record<string, CommandDefinition>,
	support: CommandSupport
): (msg: Message) => Promise<void> {
	const handlers: Record<string, Command> = {};
	for (const name in commands) {
		handlers[name] = new Command(commands[name]);
	}
	return async function messageCreate(msg: Message): Promise<void> {
		// Ignore messages from all bots and replies
		if (msg.author.bot || msg.messageReference) {
			return;
		}
		if (msg.mentions.includes(bot.user)) {
			return await handlers["help"]?.run(msg, [], support);
		}
		if (msg.content.startsWith(prefix)) {
			const terms = msg.content.split(" ");
			const cmdName = terms[0].slice(prefix.length).toLowerCase();
			const args = terms
				.slice(1) // this works fine and returns an empty array if there's only 1 element in terms
				.join(" ")
				.split("|")
				.map(s => s.trim());
			await handlers[cmdName]?.run(msg, args, support);
		} else {
			// If this throws, we crash out
			await support.tournamentManager.confirmPlayer(wrapMessageIn(msg));
		}
	};
}
