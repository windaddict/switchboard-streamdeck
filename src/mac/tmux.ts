/**
 * Pure parsing + target-resolution helpers for driving tmux from the plugin.
 *
 * None of these functions shell out — they take the raw stdout of tmux
 * commands as strings and return plain data, so they are fully unit-testable.
 */

/** A single tmux window, as parsed from `tmux list-windows`. */
export interface TmuxWindow {
	/** The session this window belongs to, e.g. "dev". */
	session: string;
	/** The window's index within its session (numeric). */
	index: number;
	/** The window's name, e.g. "movingavg". */
	name: string;
	/** Whether this is the active window in its session. */
	active: boolean;
}

/**
 * Parse the output of:
 *   tmux list-windows -a -F "#{session_name}|#{window_index}|#{window_name}|#{window_active}"
 *
 * Each non-blank line is split on `|` into exactly four fields:
 * `session | index | name | active`. `active` is `true` only for the literal
 * string `"1"`; anything else is `false`. `index` is parsed as a number.
 *
 * Blank lines and lines with fewer than four `|`-separated fields are skipped.
 * Window names never contain `|` (tmux uses it only as our separator here).
 */
export function parseWindows(output: string): TmuxWindow[] {
	const windows: TmuxWindow[] = [];

	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0) {
			continue;
		}

		const fields = line.split("|");
		if (fields.length < 4) {
			continue;
		}

		const [session, index, name, active] = fields;
		windows.push({
			session,
			index: Number(index),
			name,
			active: active === "1",
		});
	}

	return windows;
}

/**
 * Parse the output of:
 *   tmux list-clients -F "#{client_tty}|#{client_session}"
 *
 * Returns a map of session name → client tty. If a session appears on more
 * than one line, the FIRST occurrence wins. Blank and malformed lines (fewer
 * than two `|`-separated fields) are skipped.
 */
export function parseClients(output: string): Map<string, string> {
	const clients = new Map<string, string>();

	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0) {
			continue;
		}

		const fields = line.split("|");
		if (fields.length < 2) {
			continue;
		}

		const [tty, session] = fields;
		if (!clients.has(session)) {
			clients.set(session, tty);
		}
	}

	return clients;
}

/**
 * Resolve a user-supplied target string to a single {@link TmuxWindow}.
 *
 * The target is trimmed first; an empty/whitespace-only target returns `null`.
 *
 * Two forms are supported:
 *
 * - `"session:name"` — the part before `:` must match a window's session
 *   exactly (case-insensitive) AND the part after must match the window's name
 *   exactly (case-insensitive). If the part after `:` is all digits, it ALSO
 *   matches when it equals the window's index.
 *
 * - `"name"` (no colon) — first try a case-insensitive EXACT name match across
 *   all windows; if none, fall back to a case-insensitive SUBSTRING match.
 *   Returns the first match in either pass.
 *
 * Returns `null` when nothing matches.
 */
export function resolveTarget(
	windows: TmuxWindow[],
	target: string,
): TmuxWindow | null {
	const trimmed = target.trim();
	if (trimmed.length === 0) {
		return null;
	}

	const colon = trimmed.indexOf(":");
	if (colon !== -1) {
		const sessionPart = trimmed.slice(0, colon).toLowerCase();
		const namePart = trimmed.slice(colon + 1);
		const namePartLower = namePart.toLowerCase();
		const isIndex = namePart.length > 0 && /^\d+$/.test(namePart);
		const indexValue = isIndex ? Number(namePart) : NaN;

		for (const w of windows) {
			if (w.session.toLowerCase() !== sessionPart) {
				continue;
			}
			if (w.name.toLowerCase() === namePartLower) {
				return w;
			}
			if (isIndex && w.index === indexValue) {
				return w;
			}
		}

		return null;
	}

	const targetLower = trimmed.toLowerCase();

	// Pass 1: exact (case-insensitive) name match.
	for (const w of windows) {
		if (w.name.toLowerCase() === targetLower) {
			return w;
		}
	}

	// Pass 2: substring (case-insensitive) name match.
	for (const w of windows) {
		if (w.name.toLowerCase().includes(targetLower)) {
			return w;
		}
	}

	return null;
}

/** The tmux args that select the given window: `select-window -t <session>:<index>`. */
export function selectWindowArgs(w: TmuxWindow): string[] {
	return ["select-window", "-t", `${w.session}:${w.index}`];
}

/** Human-readable dropdown label, e.g. `"dev: movingavg"`. */
export function tmuxWindowLabel(w: TmuxWindow): string {
	return `${w.session}: ${w.name}`;
}

/** Stable dropdown/target value, e.g. `"dev:movingavg"`. */
export function tmuxWindowValue(w: TmuxWindow): string {
	return `${w.session}:${w.name}`;
}
