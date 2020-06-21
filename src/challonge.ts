import { challongeUsername, challongeToken } from "./config/env";
import fetch from "node-fetch";

type TournamentType = "single elimination" | "double elimination" | "round robin" | "swiss";
type RankedBy = "match wins" | "game wins" | "points scored" | "points difference" | "custom";

interface CreateTournamentSettings {
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
}

interface CreateTournamentResponse {
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
		tie_breaks: string[];
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
	};
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

interface AddParticipantReponse {
	participant: {
		active: boolean;
		checked_in_at: null | Date;
		created_at: Date;
		final_rank: null | string;
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

interface ChallongeMatch {
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

type IndexMatchResponse = ChallongeMatch[];

interface UpdateMatchSettings {
	scores_csv?: string;
	winner_id?: number | "tie";
	player1_votes?: number;
	player2_votes?: number;
}

class Challonge {
	private domain: string;
	constructor(user: string, token: string) {
		this.domain = "https://" + user + ":" + token + "@api.challonge.com/v1/";
	}

	public async createTournament(settings: CreateTournamentSettings): Promise<CreateTournamentResponse> {
		const response = await fetch(this.domain + "tournaments.json", {
			method: "POST",
			body: JSON.stringify({ tournament: settings }),
			headers: { "Content-Type": "application/json" }
		});
		return await response.json();
	}

	public async startTournament(tournament: string, settings: StartTournamentSettings): Promise<void> {
		await fetch(this.domain + "tournaments/" + tournament + "/start.json", {
			method: "POST",
			body: JSON.stringify(settings),
			headers: { "Content-Type": "application/json" }
		});
		return;
	}

	public async finalizeTournament(tournament: string, settings: StartTournamentSettings): Promise<void> {
		await fetch(this.domain + "tournaments/" + tournament + "/finalize.json", {
			method: "POST",
			body: JSON.stringify(settings),
			headers: { "Content-Type": "application/json" }
		});
		return;
	}

	public async addParticipant(tournament: string, settings: AddParticipantSettings): Promise<AddParticipantReponse> {
		const response = await fetch(this.domain + "tournaments/" + tournament + "/participants.json", {
			method: "POST",
			body: JSON.stringify({ participant: settings }),
			headers: { "Content-Type": "application/json" }
		});
		return await response.json();
	}

	public async indexMatches(
		tournament: string,
		state?: ChallongeMatchState,
		participantId?: number
	): Promise<IndexMatchResponse> {
		let url = this.domain + "tournaments/" + tournament + "/matches.json";
		if (state) {
			url += "?state=" + state;
			if (participantId) {
				url += "&participant_id=" + participantId.toString();
			}
		} else if (participantId) {
			url += "?participant_id=" + participantId.toString();
		}
		const response = await fetch(url, {
			method: "GET",
			headers: { "Content-Type": "application/json" }
		});
		return await response.json();
	}

	public async updateMatch(
		tournament: string,
		match: string,
		settings: UpdateMatchSettings
	): Promise<ChallongeMatch> {
		const response = await fetch(this.domain + "tournaments/" + tournament + "/matches/" + match + ".json", {
			method: "PUT",
			body: JSON.stringify({ match: settings }),
			headers: { "Content-Type": "application/json" }
		});
		return await response.json();
	}
}

export const challonge = new Challonge(challongeUsername, challongeToken);
