declare module "tournament-organizer" {
	export const EventManager: typeof import("./EventManager");
	export const Tournament: typeof import("./Tournament");
	export const Player: typeof import("./Player");
	export const Match: typeof import("./Match");
}
