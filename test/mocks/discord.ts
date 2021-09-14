import {
	DiscordAttachmentOut,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordWrapper
} from "../../src/discord/interface";
import { BlockedDMsError } from "../../src/util/errors";

export class DiscordWrapperMock implements DiscordWrapper {
	private messages: { [channelId: string]: DiscordMessageOut } = {};
	private files: { [channelId: string]: DiscordAttachmentOut } = {};
	private emoji: { [messageId: string]: string } = {};

	public async sendMessage(
		channelId: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		this.messages[channelId] = msg;
		if (file) {
			this.files[channelId] = file;
		}
		return {
			id: "testId",
			content: typeof msg === "string" ? msg : "embed",
			attachments: [],
			author: "you",
			channelId: channelId,
			serverId: "testServer",
			reply: async (msg: DiscordMessageOut, file?: DiscordAttachmentOut): Promise<void> => {
				this.messages[channelId] = msg;
				if (file) {
					this.files[channelId] = file;
				}
			},
			react: async (emoji: string): Promise<void> => {
				this.emoji[channelId] = emoji;
			},
			edit: async (newMsg: DiscordMessageOut): Promise<void> => {
				this.messages[channelId] = newMsg;
			}
		};
	}

	public async removeUserReaction(): Promise<boolean> {
		return true;
	}

	public getUsername(userId: string): string {
		return userId;
	}

	public async getRESTUsername(): Promise<string> {
		throw new Error("Not implemented");
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		if (userId.includes("block")) {
			throw new BlockedDMsError(userId);
		}
		this.messages[userId] = content;
	}
}
