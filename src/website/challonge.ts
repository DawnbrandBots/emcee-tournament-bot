import fetch from "node-fetch";
import { ChallongeAPIError } from "../util/errors";
import { WebsiteWrapper } from "./interface";

export interface WebsitePlayer {
	challongeId: number;
	discordId: string;
	active: boolean; // !dropped
	rank: number;
	seed: number;
}

export type ChallongeTieBreaker =
	| "match wins"
	| "game wins"
	| "game win percentage"
	| "points scored"
	| "points difference"
	| "match wins vs tied"
	| "median buchholz";

// interface structure WIP as fleshed out command-by-command
export interface WebsiteTournament {
	id: string;
	name: string;
	desc: string;
	url: string;
	players: WebsitePlayer[];
	rounds: number;
	tieBreaks: ChallongeTieBreaker[];
}

export interface WebsiteMatch {
	player1: number;
	player2: number;
	matchId: number;
	open: boolean;
	round: number;
}

type TournamentType = "single elimination" | "double elimination" | "round robin" | "swiss";
type RankedBy = "match wins" | "game wins" | "points scored" | "points difference" | "custom";

interface ChallongeTournamentSettings {
	name?: string;
	tournament_type?: TournamentType;
	url?: string;
	subdomain?: string;
	description?: string;
	open_signup?: boolean;
	hold_third_place_match?: boolean;
	pts_for_match_win?: number;
	pts_for_match_tie?: number;
	pts_for_game_win?: number;
	pts_for_game_tie?: number;
	pts_for_bye?: number;
	swiss_rounds?: number;
	ranked_by?: RankedBy;
	rr_pts_for_match_win?: number;
	rr_pts_for_match_tie?: number;
	rr_pts_for_game_win?: number;
	rr_pts_for_game_tie?: number;
	accept_attachments?: boolean;
	hide_forum?: boolean;
	show_rounds?: boolean;
	private?: boolean;
	notify_users_when_matches_open?: boolean;
	notify_users_when_the_tournament_ends?: boolean;
	sequential_pairings?: boolean;
	signup_cap?: number;
	start_at?: Date;
	check_in_duration?: number;
	grand_finals_modifier?: null | "single match" | "skip";
	tie_breaks?: string[]; // undocumented, hoping exists
}

interface ChallongeParticipant {
	participant: {
		active: boolean;
		checked_in_at: null | Date;
		created_at: Date;
		final_rank: null | number;
		group_id: null | string;
		icon: null | string;
		id: number;
		invitation_id: null | number;
		invite_email: null | string;
		misc: null | string;
		name: string;
		on_waiting_list: boolean;
		seed: number;
		tournament_id: number;
		updated_at: Date;
		challonge_username: null | string;
		challonge_email_address_verified: null | boolean;
		removable: boolean;
		participatable_or_invitation_attached: boolean;
		confirm_remove: boolean;
		invitation_pending: boolean;
		display_name_with_invitation_email_address: string;
		email_hash: null | string;
		username: null | string;
		attached_participatable_portrait_url: null | string;
		can_check_in: boolean;
		checked_in: boolean;
		reactivatable: boolean;
	};
}

type ChallongeMatchState = "all" | "pending" | "open" | "complete";

export interface ChallongeMatch {
	match: {
		attachment_count: null | number;
		created_at: Date;
		group_id: null | number;
		has_attachment: boolean;
		id: number;
		identifier: string;
		location: null | string;
		loser_id: null | number;
		player1_id: number;
		player1_is_prereq_match_loser: boolean;
		player1_prereq_match_id: null | number;
		player1_votes: null | number;
		player2_id: number;
		player2_is_prereq_match_loser: boolean;
		player2_prereq_match_id: null | number;
		player2_votes: null | number;
		round: number;
		scheduled_time: null | Date;
		started_at: Date;
		state: ChallongeMatchState;
		tournament_id: number;
		underway_at: null | Date;
		updated_at: Date;
		winner_id: null | number;
		prerequisite_match_ids_csv: string;
		scores_csv: string;
	};
}

interface ChallongeTournament {
	tournament: {
		accept_attachments: boolean;
		allow_participant_match_reporting: boolean;
		anonymous_voting: boolean;
		category: null;
		check_in_duration: null | number;
		completed_at: null | Date;
		created_at: Date;
		created_by_api: boolean;
		credit_capped: boolean;
		description: string;
		game_id: number;
		group_stages_enabled: boolean;
		hide_forum: boolean;
		hide_seeds: boolean;
		hold_third_place_match: boolean;
		id: number;
		max_predictions_per_user: number;
		name: string;
		notify_users_when_matches_open: boolean;
		notify_users_when_the_tournament_ends: boolean;
		open_signup: boolean;
		participants_count: number;
		prediction_method: number;
		predictions_opened_at: null | Date;
		private: boolean;
		progress_meter: number;
		pts_for_bye: number;
		pts_for_game_tie: number;
		pts_for_game_win: number;
		pts_for_match_tie: number;
		pts_for_match_win: number;
		quick_advance: boolean;
		ranked_by: RankedBy;
		require_score_agreement: boolean;
		rr_pts_for_game_tie: number;
		rr_pts_for_game_win: number;
		rr_pts_for_match_tie: number;
		rr_pts_for_match_win: number;
		sequential_pairings: boolean;
		show_rounds: boolean;
		signup_cap: null | number;
		start_at: null | Date;
		started_at: null | Date;
		started_checking_in_at: null | Date;
		state: string;
		swiss_rounds: number;
		teams: boolean;
		tie_breaks: null | string[];
		tournament_type: TournamentType;
		updated_at: Date;
		url: string;
		description_source: string;
		subdomain: null | string;
		full_challonge_url: string;
		live_image_url: string;
		sign_up_url: null | string;
		review_before_finalizing: boolean;
		accepting_predictions: boolean;
		participants_locked: boolean;
		game_name: string;
		participants_swappable: boolean;
		team_convertable: boolean;
		group_stages_were_started: boolean;
		participants?: ChallongeParticipant[];
		matches?: ChallongeMatch[];
	};
}

type IndexMatchResponse = ChallongeMatch[];

interface UpdateMatchSettings {
	scores_csv?: string;
	winner_id?: number | "tie";
	player1_votes?: number;
	player2_votes?: number;
}

interface StartTournamentSettings {
	include_participants?: 0 | 1;
	include_matches?: 0 | 1;
}

interface AddParticipantSettings {
	name?: string;
	challonge_username?: string;
	email?: string;
	seed?: number;
	misc?: string;
}

export class WebsiteWrapperChallonge implements WebsiteWrapper {
	private baseUrl: string;
	constructor(user: string, token: string) {
		this.baseUrl = `https://${user}:${token}@api.challonge.com/v1/`;
	}

	// this whole function sucks for typechecking because of the uncertaintly of parsing arbitrary JSON
	// TODO: document assumptions made based on challonge API documentation
	private async fetch<T>(...args: Parameters<typeof fetch>): Promise<T> {
		const response = await fetch(...args);
		const body = await response.json().catch(() => ({
			errors: [
				`Invalid ${response.headers.get("Content-Type")} response: ${response.status} ${response.statusText}`
			]
		}));
		if (body.errors) {
			throw new ChallongeAPIError(body.errors[0]);
		}
		return body as T;
	}

	private wrapTournament(t: ChallongeTournament): WebsiteTournament {
		const tournament = t.tournament;
		const p = tournament.participants;
		const participants = p ? p.map(this.wrapPlayer) : [];
		return {
			id: tournament.url,
			name: tournament.name,
			desc: tournament.description,
			url: `https://challonge.com/${tournament.url}`,
			players: participants,
			rounds: tournament.swiss_rounds,
			tieBreaks: tournament.tie_breaks
				? (tournament.tie_breaks as ChallongeTieBreaker[])
				: ["match wins vs tied", "median buchholz", "points difference"] // challonge default in UI
		};
	}

	public async createTournament(name: string, desc: string, url: string, topCut = false): Promise<WebsiteTournament> {
		const settings: ChallongeTournamentSettings = {
			name,
			description: desc,
			url,
			tournament_type: topCut ? "single elimination" : "swiss"
		};
		const tournament = await this.fetch<ChallongeTournament>(`${this.baseUrl}tournaments.json`, {
			method: "POST",
			body: JSON.stringify({ tournament: settings }),
			headers: { "Content-Type": "application/json" }
		});
		return this.wrapTournament(tournament);
	}

	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		const settings: ChallongeTournamentSettings = {
			name,
			description: desc
		};
		await this.fetch(`${this.baseUrl}tournaments/${tournamentId}.json`, {
			method: "PUT",
			body: JSON.stringify({ tournament: settings }),
			headers: { "Content-Type": "application/json" }
		});
	}

	public async updateTieBreakers(tournamentId: string, tbs: ChallongeTieBreaker[]): Promise<void> {
		const settings: ChallongeTournamentSettings = {
			tie_breaks: tbs
		};
		await this.fetch(`${this.baseUrl}tournaments/${tournamentId}.json`, {
			method: "PUT",
			body: JSON.stringify({ tournament: settings }),
			headers: { "Content-Type": "application/json" }
		});
	}

	private async showTournament(
		tournamentId: string,
		includeParticipants = false,
		includeMatches = false
	): Promise<ChallongeTournament> {
		return await this.fetch<ChallongeTournament>(
			`${this.baseUrl}tournaments/${tournamentId}.json?include_participants=${Number(
				includeParticipants
			)}&include_matches=${Number(includeMatches)}`
		);
	}

	private async setDiscordId(tournamentId: string, playerId: number, newId: string): Promise<void> {
		await this.fetch(`${this.baseUrl}tournaments/${tournamentId}/participants/${playerId}.json`, {
			method: "PUT",
			body: JSON.stringify({
				participant: {
					misc: newId
				}
			}),
			headers: { "Content-Type": "application/json" }
		});
	}

	public async getTournament(tournamentId: string): Promise<WebsiteTournament> {
		const tournament = await this.showTournament(tournamentId, true, true);
		// this function is called when synchronising the database with challonge
		// so we have to handle dummy players here
		if (tournament.tournament.participants) {
			// find players w/o saved discordId
			const dummies = tournament.tournament.participants.filter(p => p.participant.misc === null);
			let i = 0;
			for (const dummy of dummies) {
				// increment ID to ensure unique IDs
				while (tournament.tournament.participants.find(p => p.participant.misc === `DUMMY${i}`)) {
					i++;
				}
				// update ID on remote
				await this.setDiscordId(tournamentId, dummy.participant.id, `DUMMY${i}`);
				// update ID on local copy for synchronisation
				const index = tournament.tournament.participants.findIndex(
					p => p.participant.id === dummy.participant.id
				);
				if (index > -1) {
					tournament.tournament.participants[index].participant.misc = `DUMMY${i}`;
				}
				// increment ID again because we know this one is taken now
				i++;
			}
		}

		return this.wrapTournament(tournament);
	}

	private async startTournamentRemote(tournamentId: string, settings: StartTournamentSettings): Promise<void> {
		await this.fetch(`${this.baseUrl}tournaments/${tournamentId}/start.json`, {
			method: "POST",
			body: JSON.stringify(settings),
			headers: { "Content-Type": "application/json" }
		});
	}

	public async startTournament(tournamentId: string): Promise<void> {
		await this.startTournamentRemote(tournamentId, { include_matches: 0, include_participants: 0 });
	}

	private async addParticipant(
		tournamentId: string,
		settings: AddParticipantSettings
	): Promise<ChallongeParticipant> {
		return await this.fetch<ChallongeParticipant>(`${this.baseUrl}tournaments/${tournamentId}/participants.json`, {
			method: "POST",
			body: JSON.stringify({ participant: settings }),
			headers: { "Content-Type": "application/json" }
		});
	}

	public async registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number> {
		const participant = await this.addParticipant(tournamentId, {
			name: playerName,
			misc: playerId
		});
		return participant.participant.id;
	}

	public async removePlayer(tournamentId: string, playerId: number): Promise<void> {
		await fetch(`${this.baseUrl}tournaments/${tournamentId}/participants/${playerId}.json`, {
			method: "DELETE"
		});
	}

	private async indexMatches(
		tournamentId: string,
		state?: ChallongeMatchState,
		participantId?: number
	): Promise<IndexMatchResponse> {
		let url = `${this.baseUrl}tournaments/${tournamentId}/matches.json`;
		if (state) {
			url += `?state=${state}`;
			if (participantId) {
				url += `&participant_id=${participantId}`;
			}
		} else if (participantId) {
			url += `?participant_id=${participantId}`;
		}
		return await this.fetch<IndexMatchResponse>(url);
	}

	private wrapMatch(m: ChallongeMatch): WebsiteMatch {
		const match = m.match;
		return {
			player1: match.player1_id,
			player2: match.player2_id,
			matchId: match.id,
			open: match.state === "open",
			round: match.round
		};
	}

	public async getMatches(tournamentId: string, open = false, playerId?: number): Promise<WebsiteMatch[]> {
		const webMatches = await this.indexMatches(tournamentId, open ? "open" : undefined, playerId);
		return webMatches.map(this.wrapMatch);
	}

	private async updateMatch(
		tournamentId: string,
		match: number,
		settings: UpdateMatchSettings
	): Promise<ChallongeMatch> {
		return await this.fetch<ChallongeMatch>(`${this.baseUrl}tournaments/${tournamentId}/matches/${match}.json`, {
			method: "PUT",
			body: JSON.stringify({ match: settings }),
			headers: { "Content-Type": "application/json" }
		});
	}

	public async submitScore(
		tournamentId: string,
		match: WebsiteMatch,
		winner: number,
		winnerScore: number,
		loserScore: number
	): Promise<void> {
		const score = match.player1 === winner ? `${winnerScore}-${loserScore}` : `${loserScore}-${winnerScore}`;
		await this.updateMatch(tournamentId, match.matchId, {
			winner_id: winnerScore === loserScore ? "tie" : winner,
			scores_csv: score
		});
	}

	private async indexPlayers(tournamentId: string): Promise<ChallongeParticipant[]> {
		return await this.fetch<ChallongeParticipant[]>(`${this.baseUrl}tournaments/${tournamentId}/participants.json`);
	}

	private wrapPlayer(p: ChallongeParticipant): WebsitePlayer {
		const player = p.participant;
		return {
			challongeId: player.id,
			discordId: player.misc || "DUMMY", // Dummy players should have already been given an enumerated ID
			active: player.active,
			rank: player.final_rank || -1,
			seed: player.seed
		};
	}

	public async getPlayers(tournamentId: string): Promise<WebsitePlayer[]> {
		const players = await this.indexPlayers(tournamentId);
		return players.map(this.wrapPlayer);
	}

	private async finaliseTournament(tournamentId: string, settings: StartTournamentSettings): Promise<void> {
		await this.fetch(`${this.baseUrl}tournaments/${tournamentId}/finalize.json`, {
			method: "POST",
			body: JSON.stringify(settings),
			headers: { "Content-Type": "application/json" }
		});
	}

	public async finishTournament(tournamentId: string): Promise<void> {
		await this.finaliseTournament(tournamentId, { include_matches: 0, include_participants: 0 });
	}

	public async setSeed(tournamentId: string, playerId: number, newSeed: number): Promise<void> {
		await this.fetch(`${this.baseUrl}tournaments/${tournamentId}/participants/${playerId}.json`, {
			method: "PUT",
			body: JSON.stringify({
				participant: {
					seed: newSeed
				}
			}),
			headers: { "Content-Type": "application/json" }
		});
	}

	public async getPlayer(tournamentId: string, playerId: number): Promise<WebsitePlayer> {
		const response = await this.fetch<ChallongeParticipant>(
			`${this.baseUrl}tournaments/${tournamentId}/participants/${playerId}.json`
		);
		return this.wrapPlayer(response);
	}

	public async shufflePlayers(tournamentId: string): Promise<void> {
		await this.fetch(`${this.baseUrl}tournaments/${tournamentId}/participants/randomize.json`, {
			method: "POST"
		});
	}
}
