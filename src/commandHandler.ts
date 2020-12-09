import { Logger } from "winston";
import { prettyPrint } from "./discordDeck";
import { discord } from "./discordEris";
import { DiscordInterface, DiscordMessageIn } from "./discordGeneric";
import { UserError } from "./errors";
import logger from "./logger";
import { tournamentManager, TournamentManager } from "./tournamentManager";

class CommandHandler {
	private discord: DiscordInterface;
	private tournamentManager: TournamentManager;
	private logger: Logger;
	constructor(discord: DiscordInterface, tournamentManager: TournamentManager, logger: Logger) {
		this.discord = discord;
		this.tournamentManager = tournamentManager;
		this.logger = logger;

		this.discord.registerCommand("help", this.commandHelp);
		this.discord.onPing(this.commandHelp);
		this.discord.registerCommand("list", this.commandListTournaments);
		this.discord.registerCommand("create", this.commandCreateTournament);
		this.discord.registerCommand("update", this.commandUpdateTournament);
		this.discord.registerCommand("addchannel", this.commandAddChannel);
		this.discord.registerCommand("addchannel", this.commandRemoveChannel);
		this.discord.registerCommand("addhost", this.commandAddHost);
		this.discord.registerCommand("removehost", this.commandRemoveHost);
		this.discord.registerCommand("open", this.commandOpenTournament);
		this.discord.registerCommand("start", this.commandStartTournament);
		this.discord.registerCommand("cancel", this.commandCancelTournament);
		this.discord.registerCommand("score", this.commandSubmitScore);
		this.discord.registerCommand("round", this.commandNextRound);
		this.discord.registerCommand("players", this.commandListPlayers);
		this.discord.registerCommand("deck", this.commandGetDeck);
		this.discord.registerCommand("drop", this.commandDropPlayer);
		this.discord.registerCommand("sync", this.commandSyncTournament);
	}
	private async commandHelp(msg: DiscordMessageIn): Promise<void> {
		await msg.reply(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	}

	private async commandListTournaments(msg: DiscordMessageIn): Promise<void> {
		await this.discord.authenticateTO(msg);
		const list = await this.tournamentManager.listTournaments();
		await msg.reply(`\`\`\`\n${list}\`\`\``);
	}

	private async commandCreateTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
		await this.discord.authenticateTO(msg);
		const [name, desc] = args;
		const [id, url] = await this.tournamentManager.createTournament(msg.author, msg.server, name, desc);
		this.logger.verbose(`New tournament created ${id} by ${msg.author}.`);
		await msg.reply(
			`Tournament ${name} created! You can find it at ${url}. For future commands, refer to this tournament by the id \`${id}\`.`
		);
	}

	private async commandUpdateTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id, name, desc] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		await this.tournamentManager.updateTournament(id, name, desc);
		this.logger.verbose(`Tournament ${id} updated with name ${name} and description ${desc} by ${msg.author}.`);
		await msg.reply(`{
		Tournament \`${id}\` updated! It now has the name ${name} and the given description.
	}`);
	}

	private async commandAddChannel(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const id = args[0];
		let [, type, channel] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		if (!(type === "private")) {
			type = "public";
		}
		// TODO: Parse actual channel mention. Just sketching out the structure for now.
		if (!channel) {
			channel = msg.channel;
		}
		await this.tournamentManager.addAnnouncementChannel(id, channel, type as "public" | "private");
		await this.discord.sendMessage(
			`This channel added as a ${type} announcement channel for Tournament ${id}!`,
			channel
		);
		await msg.reply(
			`${this.discord.mentionChannel(channel)} added as a ${type} announcement channel for Tournament ${id}!`
		);
	}

	private async commandRemoveChannel(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const id = args[0];
		let [, type, channel] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		if (!(type === "private")) {
			type = "public";
		}
		// TODO: Parse actual channel mention. Just sketching out the structure for now.
		if (!channel) {
			channel = msg.channel;
		}
		await tournamentManager.removeAnnouncementChannel(id, channel, type as "public" | "private");
		await this.discord.sendMessage(
			`This channel removed as a ${type} announcement channel for Tournament ${id}!`,
			channel
		);
		await msg.reply(
			`${this.discord.mentionChannel(channel)} removed as a ${type} announcement channel for Tournament ${id}!`
		);
	}

	private async commandAddHost(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		const newHost = this.discord.getMentionedUser(msg);
		await this.tournamentManager.addHost(id, newHost);
		await msg.reply(`${this.discord.mentionUser(newHost)} added as a host for Tournament ${id}!`);
	}

	private async commandRemoveHost(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		const newHost = this.discord.getMentionedUser(msg);
		await this.tournamentManager.removeHost(id, newHost);
		await msg.reply(`${this.discord.mentionUser(newHost)} removed as a host for Tournament ${id}!`);
	}

	private async commandOpenTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		await this.tournamentManager.openTournament(id);
		await msg.reply(`Tournament ${id} opened for registration!`);
	}

	private async commandStartTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		await this.tournamentManager.startTournament(id);
		await msg.reply(`Tournament ${id} successfully commenced!`);
	}

	private async commandCancelTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		await this.tournamentManager.startTournament(id);
		await msg.reply(`Tournament ${id} successfully canceled.`);
	}

	// TODO infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
	private async commandSubmitScore(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id, score] = args;
		await this.tournamentManager.authenticatePlayer(id, msg.author);
		const scores = score.split("-");
		const scoreNums = scores.map(s => parseInt(s, 10));
		if (scoreNums.length < 2) {
			throw new UserError("Must provide score in format `#-#` e.g. `2-1`.");
		}
		await this.tournamentManager.submitScore(id, msg.author, scoreNums[0], scoreNums[1]);
		await msg.reply(
			`Score of ${scoreNums[0]}-${scoreNums[1]} recorded for ${this.discord.mentionUser(
				msg.author
			)} in Tournament ${id}.`
		);
	}

	private async commandNextRound(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		const round = await this.tournamentManager.nextRound(id);
		await msg.reply(`Tournament ${id} successfully progressed to round ${round}.`);
	}

	private async commandListPlayers(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		const list = await this.tournamentManager.listPlayers(id);
		await msg.reply(list);
	}

	private async commandGetDeck(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		const player = this.discord.getMentionedUser(msg);
		const deck = await this.tournamentManager.getPlayerDeck(id, player);
		// TODO: Use player structs or add a name getter to the interface so we can name this file better.
		const [message, attachment] = prettyPrint(deck, `${player}.ydk`);
		await msg.reply(message, attachment);
	}

	private async commandDropPlayer(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		const player = this.discord.getMentionedUser(msg);
		await this.tournamentManager.dropPlayer(id, player);
		// TODO: Use player structs or add a name getter to the interface so we can reply better.
		await msg.reply(`Player ${player} successfully dropped from Tournament ${id}.`);
	}

	private async commandSyncTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
		const [id] = args;
		await this.tournamentManager.authenticateHost(id, msg.author);
		await this.tournamentManager.syncTournament(id);
		await msg.reply(`Tournament ${id} database successfully synchronised with remote website.`);
	}
}

new CommandHandler(discord, tournamentManager, logger);
