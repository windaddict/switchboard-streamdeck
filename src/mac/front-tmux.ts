/**
 * Which tmux session is in the frontmost macOS window? Chains the probes the
 * live tmux key faces already use: frontmost app (NSWorkspace JXA) → iTerm's
 * focused-session tty (only queried when iTerm IS frontmost — addressing a
 * non-running app via AppleScript would launch it) → tmux list-clients tty →
 * session. Null when indeterminate (iTerm not frontmost, no tmux client on
 * that tty, …); callers fall back to tmux's untargeted default.
 *
 * The probe costs ~0.3s, so the result is cached briefly — a rotation burst
 * pays it once, and you don't change macOS windows mid-burst.
 */

import { runAppleScript, runJxa } from "../applescript/runner.js";
import { FRONT_APP_BUNDLE_JXA } from "./app-windows.js";
import { ITERM_BUNDLE_ID, ITERM_FOCUSED_TTY_SCRIPT } from "./iterm.js";
import { parseClients, sessionForTty } from "./tmux.js";
import { LIST_CLIENTS_ARGS, runTmux } from "./tmux-runner.js";

const TTL_MS = 2000;

let cached: { session: string | null; at: number } | null = null;

/** Drop the cache (tests / after actions that change focus themselves). */
export function invalidateFrontTmuxSession(): void {
	cached = null;
}

export async function resolveFrontTmuxSession(tmuxPath: string): Promise<string | null> {
	if (cached !== null && Date.now() - cached.at < TTL_MS) {
		return cached.session;
	}

	let session: string | null = null;
	const front = await runJxa(FRONT_APP_BUNDLE_JXA);
	if (front.ok && front.stdout.trim() === ITERM_BUNDLE_ID) {
		const [ttyRes, clientsRes] = await Promise.all([
			runAppleScript(ITERM_FOCUSED_TTY_SCRIPT),
			runTmux(LIST_CLIENTS_ARGS, tmuxPath),
		]);
		session = sessionForTty(parseClients(clientsRes.stdout), ttyRes.stdout.trim());
	}

	cached = { session, at: Date.now() };
	return session;
}
