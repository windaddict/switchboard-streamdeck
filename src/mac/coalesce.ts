/**
 * Overlap-safe job coalescing for the polling actions. A poll tick and an
 * explicit "state just changed, repaint now" request can collide; the naive
 * `if (running) return` guard silently DROPS the explicit request, leaving a
 * freshly captured/raised key painting its old state for a full extra poll
 * cycle. This runner never overlaps the job and never loses a request: a
 * request during a run queues exactly one rerun (multiple requests coalesce
 * into that one), which starts as soon as the current run finishes — with the
 * job then reading the post-change state.
 */

export class CoalescedRunner {
	private running = false;
	private pending = false;

	constructor(private readonly job: () => Promise<void>) {}

	/**
	 * Run the job, or — if it is already running — schedule one rerun after it
	 * finishes. Resolves when the run this call participated in has finished
	 * (for a queued rerun: immediately; the rerun still executes). A throwing
	 * job never wedges the runner.
	 */
	async request(): Promise<void> {
		if (this.running) {
			this.pending = true;
			return;
		}
		this.running = true;
		try {
			do {
				this.pending = false;
				try {
					await this.job();
				} catch {
					// The job owns its error reporting; a throw must not stop a
					// queued rerun or permanently wedge the runner.
				}
			} while (this.pending);
		} finally {
			this.running = false;
		}
	}
}
