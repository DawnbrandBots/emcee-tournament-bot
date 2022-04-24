import { getLogger } from "../util/logger";
import { PersistentTimer, PersistentTimerDiscordDelegate } from "./PersistentTimer";
export * from "./PersistentTimer";

const logger = getLogger("timewizard");

export class TimeWizard {
	private timers: Map<string, PersistentTimer[]> = new Map(); // index: tournament id
	constructor(public readonly delegate: PersistentTimerDiscordDelegate) {}

	public async load(): Promise<void> {
		if (this.timers.size) {
			logger.warn(new Error("loadTimers called multiple times"));
		} else {
			const timers = await PersistentTimer.loadAll(this.delegate);
			let count = 0;
			for (const timer of timers) {
				if (timer.tournament) {
					this.timers.set(timer.tournament, this.timers.get(timer.tournament)?.concat(timer) || [timer]);
					count++;
				} else {
					logger.warn(new Error("Aborting orphaned timer"));
					await timer.abort();
				}
			}
			const tournaments = this.timers.size;
			logger.info(`Loaded ${count} of ${timers.length} PersistentTimers for ${tournaments} tournaments.`);
		}
	}

	public async cancel(tournamentId: string): Promise<void> {
		logger.verbose(`cancel ${tournamentId}`);
		for (const timer of this.timers.get(tournamentId) || []) {
			await timer.abort();
		}
		this.timers.delete(tournamentId);
	}

	public async start(
		tournamentId: string,
		channels: string[],
		end: Date,
		finalMessage: string,
		cronIntervalSeconds: number
	): Promise<void> {
		this.timers.set(
			tournamentId,
			await Promise.all(
				channels.map(
					async channel =>
						await PersistentTimer.create(
							this.delegate,
							end,
							channel,
							finalMessage,
							cronIntervalSeconds,
							tournamentId
						)
				)
			)
		);
	}
}
