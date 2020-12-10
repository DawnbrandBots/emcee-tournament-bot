import { challonge, ChallongeMatch } from "./challonge";
import { GuildChannel, TextChannel } from "eris";
import {
	startTournament,
	removeRegisterMessage,
	findTournamentByRegisterMessage,
	removePendingParticipant,
	addPendingParticipant,
	nextRound,
	finishTournament,
	getPlayerFromId,
	removeConfirmedParticipant,
	dropConfirmedParticipant
} from "./actions";
import { bot } from "./bot";
import { AssertTextChannelError, UserError, MiscInternalError } from "./errors";
import logger from "./logger";

const tournaments: {
	[id: string]: Tournament;
} = {};

export function getTournament(id: string): Tournament | undefined {
	return tournaments[id];
}

async function reportDrop(channelId: string, userId: string, tournament: string): Promise<string> {
	const channel = bot.getChannel(channelId);
	if (!(channel instanceof TextChannel)) {
		throw new AssertTextChannelError(channelId);
	}
	const msg = await channel.createMessage(`User <@${userId}> has dropped from ${tournament}`);
	return msg.id;
}

export function mention(discordId: string): string {
	if (discordId === "DUMMY") {
		return "a dummy user";
	}
	return `<@${discordId}>`;
}

export class Tournament {
	readonly id: string;
	private roles: { [guild: string]: string } = {};
	constructor(id: string) {
		this.id = id;
	}

	private async startRound(
		channelId: string,
		url: string,
		round: number,
		name: string,
		bye?: string
	): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const role = await this.getRole(channelId);
		let message = `Round ${round} of ${name} has begun! <@&${role}>\nPairings: https://challonge.com/${url}`;
		if (bye) {
			message += `\n${mention(bye)} has the bye for this round.`;
		}
		const msg = await channel.createMessage(message);
		return msg.id;
	}

	public async submitScore(
		winnerId: string,
		winnerScore: number,
		loserScore: number,
		host: string
	): Promise<ChallongeMatch> {
		await this.verifyHost(host);
		const doc = await this.getTournament();
		const winner = doc.confirmedParticipants.find(p => p.discord === winnerId);
		if (!winner) {
			throw new UserError(`Could not find a participant for <@${winnerId}>!`);
		}
		const matches = await challonge.indexMatches(this.id, "open", winner.challongeId);
		if (matches.length < 1) {
			throw new UserError(`Could not find an unfinished match for <@${winnerId}>!`);
		}
		const match = matches[0]; // if there's more than one something's gone very wack
		const result = await challonge.updateMatch(this.id, match.match.id.toString(), {
			// eslint-disable-next-line @typescript-eslint/camelcase
			winner_id: winner.challongeId,
			// eslint-disable-next-line @typescript-eslint/camelcase
			scores_csv: `${winnerScore}-${loserScore}`
		});
		logger.verbose(
			`Score submitted for tournament ${this.id} by ${host}. ${winnerId} won ${winnerScore}-${loserScore}.`
		);
		return result;
	}

	private async tieMatch(matchId: number): Promise<ChallongeMatch> {
		return await challonge.updateMatch(this.id, matchId.toString(), {
			// eslint-disable-next-line @typescript-eslint/camelcase
			winner_id: "tie",
			// eslint-disable-next-line @typescript-eslint/camelcase
			scores_csv: "0-0"
		});
	}

	public async nextRound(host: string): Promise<number> {
		await this.verifyHost(host);
		const matches = await challonge.indexMatches(this.id, "open");
		await Promise.all(matches.map(m => this.tieMatch(m.match.id)));
		const round = await nextRound(this.id, host);
		// if was last round
		if (round === -1) {
			await this.finishTournament(host);
			return -1;
		}
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		const bye = await this.checkBye();
		await Promise.all(channels.map(c => this.startRound(c, this.id, round, tournament.name, bye)));
		logger.verbose(`Tournament ${this.id} moved to round ${round} by ${host}.`);
		return round;
	}

	private async sendConclusionMessage(channelId: string, url: string, name: string, cancel = false): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const role = await this.getRole(channelId);
		const message = `${name} has ${
			cancel ? "been cancelled." : "concluded!"
		} Thank you all for playing! <@&${role}>\nResults: https://challonge.com/${url}`;
		const msg = await channel.createMessage(message);
		const roleMembers = channel.guild.members.filter(m => m.roles.includes(role));
		await Promise.all(roleMembers.map(m => m.removeRole(role, "Tournament concluded")));
		await msg.channel.guild.deleteRole(role);
		return msg.id;
	}

	public async finishTournament(host: string, cancel = false): Promise<void> {
		await this.verifyHost(host);
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		await Promise.all(channels.map(c => this.sendConclusionMessage(c, this.id, tournament.name, cancel)));
		await challonge.finaliseTournament(this.id, {});
		await finishTournament(this.id, host);
		delete tournaments[this.id];
		logger.verbose(`Tournament ${this.id} finished by ${host}.`);
	}
}
