/**
 * Which tmux client/session is in the frontmost macOS window? Chains the
 * probes the live tmux key faces already use: frontmost app (NSWorkspace JXA)
 * → iTerm's focused-session tty (only queried when iTerm IS frontmost —
 * addressing a non-running app via AppleScript would launch it) → tmux
 * list-clients tty → session. Null when indeterminate (iTerm not frontmost,
 * focused pane isn't a tmux client, …); the tmux dials treat null as
 * "nothing to control" and do nothing rather than drive a background terminal.
 *
 * The probe costs ~0.3s, so the result is cached briefly — a rotation burst
 * pays it once, and you don't change macOS windows mid-burst.
 */

import { runAppleScript, runJxa } from "../applescript/runner.js";
import { FRONT_APP_BUNDLE_JXA } from "./app-windows.js";
import { ITERM_BUNDLE_ID, ITERM_FOCUSED_TTY_SCRIPT } from "./iterm.js";
import { parseClients, sessionForTty } from "./tmux.js";
import { LIST_CLIENTS_ARGS, runTmux } from "./tmux-runner.js";

export interface FrontTmux {
	/** The tmux session shown in the frontmost macOS window. */
	session: string;
	/** That session's attached client tty (for `switch-client -c`). */
	tty: string;
}

const TTL_MS = 2000;

let cached: { front: FrontTmux | null; at: number } | null = null;
let inFlight: Promise<FrontTmux | null> | null = null;
/** Bumped by invalidation; a probe may only publish to the cache if the
 * generation it started under is still current — a stale probe finishing
 * AFTER an invalidation must not resurrect pre-invalidation state. */
let generation = 0;

/** Drop the cache and orphan any in-flight probe (its result won't publish). */
export function invalidateFrontTmux(): void {
	generation++;
	cached = null;
	inFlight = null;
}

export function resolveFrontTmux(tmuxPath: string): Promise<FrontTmux | null> {
	if (cached !== null && Date.now() - cached.at < TTL_MS) {
		return Promise.resolve(cached.front);
	}
	// Share one probe among concurrent callers (several dials rotating at
	// once must not each launch their own JXA + AppleScript + tmux trio).
	if (inFlight !== null) {
		return inFlight;
	}
	const p = probe(tmuxPath, generation);
	inFlight = p;
	void p.finally(() => {
		// Only clear our own reference — an orphaned probe's cleanup must not
		// drop a NEWER in-flight probe and trigger duplicate probing.
		if (inFlight === p) inFlight = null;
	});
	return p;
}

async function probe(tmuxPath: string, startedGeneration: number): Promise<FrontTmux | null> {
	let front: FrontTmux | null = null;
	const app = await runJxa(FRONT_APP_BUNDLE_JXA);
	if (app.ok && app.stdout.trim() === ITERM_BUNDLE_ID) {
		const [ttyRes, clientsRes] = await Promise.all([
			runAppleScript(ITERM_FOCUSED_TTY_SCRIPT),
			runTmux(LIST_CLIENTS_ARGS, tmuxPath),
		]);
		const tty = ttyRes.stdout.trim();
		const session = sessionForTty(parseClients(clientsRes.stdout), tty);
		if (session !== null) {
			front = { session, tty };
		}
	}
	if (startedGeneration === generation) {
		cached = { front, at: Date.now() };
	}
	return front;
}
