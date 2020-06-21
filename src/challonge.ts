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
}

export const challonge = new Challonge(challongeUsername, challongeToken);
