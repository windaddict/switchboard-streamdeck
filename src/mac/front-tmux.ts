/**
 * Which tmux client/session is in the frontmost macOS window? Chains the
 * probes the live tmux key faces already use: frontmost app (NSWorkspace JXA)
 * → iTerm's focused-session tty (only queried when iTerm IS frontmost —
 * addressing a non-running app via AppleScript would launch it) → tmux
 * list-clients tty → session. `resolveFrontTmux` returns null when
 * indeterminate (iTerm not frontmost, focused pane isn't a tmux client, a probe
 * step failed); the tmux dials treat null as "nothing to control" and do
 * nothing rather than drive a background terminal. `resolveFrontTmuxDetailed`
 * tells those cases apart: not-frontmost and no-client are normal (silent),
 * while a failed probe step is a failure the dials alert on.
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

/** What the probe found. Only `probe-failed` is a failure; the other two
 * non-front kinds are normal states the dials stay silent about. */
export type FrontTmuxResult =
	| { kind: "front"; front: FrontTmux }
	| { kind: "not-frontmost" }
	| { kind: "no-client" }
	| { kind: "probe-failed"; step: "front-app" | "iterm-tty" | "list-clients"; stderr: string };

const TTL_MS = 2000;

let cached: { result: FrontTmuxResult; at: number } | null = null;
let inFlight: Promise<FrontTmuxResult> | null = null;
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

/** The front tmux client, or null for every non-front classification. */
export async function resolveFrontTmux(tmuxPath: string): Promise<FrontTmux | null> {
	const r = await resolveFrontTmuxDetailed(tmuxPath);
	return r.kind === "front" ? r.front : null;
}

/** Like `resolveFrontTmux`, but says WHY there is no front client. */
export function resolveFrontTmuxDetailed(tmuxPath: string): Promise<FrontTmuxResult> {
	if (cached !== null && Date.now() - cached.at < TTL_MS) {
		return Promise.resolve(cached.result);
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

async function probe(tmuxPath: string, startedGeneration: number): Promise<FrontTmuxResult> {
	const result = await classify(tmuxPath);
	if (startedGeneration === generation) {
		cached = { result, at: Date.now() };
	}
	return result;
}

async function classify(tmuxPath: string): Promise<FrontTmuxResult> {
	const app = await runJxa(FRONT_APP_BUNDLE_JXA);
	if (!app.ok) {
		return { kind: "probe-failed", step: "front-app", stderr: app.stderr };
	}
	if (app.stdout.trim() !== ITERM_BUNDLE_ID) {
		return { kind: "not-frontmost" };
	}
	const [ttyRes, clientsRes] = await Promise.all([
		runAppleScript(ITERM_FOCUSED_TTY_SCRIPT),
		runTmux(LIST_CLIENTS_ARGS, tmuxPath),
	]);
	if (!ttyRes.ok) {
		return { kind: "probe-failed", step: "iterm-tty", stderr: ttyRes.stderr };
	}
	if (!clientsRes.ok) {
		return { kind: "probe-failed", step: "list-clients", stderr: clientsRes.stderr };
	}
	const tty = ttyRes.stdout.trim();
	const session = sessionForTty(parseClients(clientsRes.stdout), tty);
	if (session === null) {
		return { kind: "no-client" };
	}
	return { kind: "front", front: { session, tty } };
}
