import {
	DiscordAttachmentOut,
	DiscordDeleteHandler,
	DiscordMessageHandler,
	DiscordMessageIn,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordReactionHandler,
	DiscordWrapper
} from "../../src/discord/interface";

export class DiscordWrapperMock implements DiscordWrapper {
	private messageHandlers: DiscordMessageHandler[];
	private pingHandlers: DiscordMessageHandler[];
	private deleteHandlers: DiscordDeleteHandler[];

	private messages: { [channel: string]: DiscordMessageOut };
	constructor() {
		this.messageHandlers = [];
		this.pingHandlers = [];
		this.deleteHandlers = [];

		this.messages = {};
	}

	public async simMessage(content: string, testCode: string) {
		await this.messageHandlers[0]({
			id: "testId",
			content: content,
			attachments: [],
			author: "testUser",
			channel: "testChannel",
			server: "testServer",
			reply: async (msg: DiscordMessageOut) => {
				this.messages[testCode] = msg;
			},
			react: async (emoji: string) => {
				throw new Error("Not yet implemented!");
			}
		});
	}

	public async simPing(testCode: string) {
		await this.pingHandlers[0]({
			id: "testId",
			content: "@you",
			attachments: [],
			author: "testUser",
			channel: "testChannel",
			server: "testServer",
			reply: async (msg: DiscordMessageOut) => {
				this.messages[testCode] = msg;
			},
			react: async (emoji: string) => {
				throw new Error("Not yet implemented!");
			}
		});
	}

	public getResponse(testCode: string): DiscordMessageOut | undefined {
		return this.messages[testCode];
	}

	public async sendMessage(
		channel: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		throw new Error("Not yet implemented!");
	}

	public async deleteMessage(channelId: string, messageId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async getPlayerRole(tournamentId: string, channel: string): Promise<string> {
		throw new Error("Not yet implemented!");
	}

	public async grantPlayerRole(userId: string, channelId: string, roleId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async deletePlayerRole(tournamentId: string, channelId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public onMessage(handler: DiscordMessageHandler): void {
		this.messageHandlers.push(handler);
	}

	public onDelete(handler: DiscordDeleteHandler): void {
		this.deleteHandlers.push(handler);
	}

	public onPing(handler: DiscordMessageHandler): void {
		this.pingHandlers.push(handler);
	}

	public onReaction(handler: DiscordReactionHandler): void {
		throw new Error("Not yet implemented!");
	}

	public onReactionRemove(handler: DiscordReactionHandler): void {
		throw new Error("Not yet implemented!");
	}

	public async authenticateTO(m: DiscordMessageIn): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public getMentionedUser(m: DiscordMessageIn): string {
		throw new Error("Not yet implemented!");
	}

	public getUsername(userId: string): string {
		throw new Error("Not yet implemented!");
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		throw new Error("Not yet implemented!");
	}
}
