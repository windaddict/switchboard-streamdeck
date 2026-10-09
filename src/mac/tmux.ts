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
	/**
	 * tmux's window id, e.g. "@12". Unlike the index and the name it stays the
	 * same for the window's whole life — through renames and through
	 * `renumber-windows` shifting indexes when a lower window closes — so it is
	 * what binds a key to one of several same-named windows. A server never
	 * reuses an id, but a RESTARTED server numbers from @0 again, so an id only
	 * means anything together with {@link serverPid}.
	 */
	id: string;
	/** The tmux server's pid (`#{pid}`): tells one server's ids from the next one's. */
	serverPid: string;
}

/**
 * Parse the output of:
 *   tmux list-windows -a -F "#{session_name}|#{window_index}|#{window_active}|#{window_id}|#{pid}|#{window_name}"
 *
 * Each non-blank line is split on `|`: `session | index | active | id | pid | name…`.
 * The window NAME is the LAST field and may itself contain `|` — the fixed
 * fields come first and the remainder is joined back into the name. `active`
 * is `true` only for the literal string `"1"`. Blank/short lines are skipped.
 */
export function parseWindows(output: string): TmuxWindow[] {
	const windows: TmuxWindow[] = [];

	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0) {
			continue;
		}

		const fields = line.split("|");
		if (fields.length < 6) {
			continue;
		}

		const [session, index, active, id, serverPid] = fields;
		windows.push({
			session,
			index: Number(index),
			name: fields.slice(5).join("|"),
			active: active === "1",
			id,
			serverPid,
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

/** Preserve every attached client tty per session instead of silently picking one. */
export function parseClientTtys(output: string): Map<string, string[]> {
	const clients = new Map<string, string[]>();
	for (const rawLine of output.split("\n")) {
		const fields = rawLine.trim().split("|");
		if (fields.length < 2 || fields[0] === "" || fields[1] === "") continue;
		const [tty, session] = fields;
		const ttys = clients.get(session) ?? [];
		if (!ttys.includes(tty)) ttys.push(tty);
		clients.set(session, ttys);
	}
	return clients;
}

/** Prefer the already-focused client, otherwise preserve tmux's deterministic order. */
export function chooseClientTty(ttys: readonly string[], focusedTty: string): string | null {
	if (focusedTty !== "" && ttys.includes(focusedTty)) return focusedTty;
	return ttys[0] ?? null;
}

/** Target one attached client and its exact tmux window — by index, or by window id ("@8"). */
export function switchClientToWindowArgs(session: string, window: number | string, clientTty: string): string[] {
	return ["switch-client", "-c", clientTty, "-t", `${session}:${window}`];
}

/**
 * Reverse lookup on {@link parseClients}: which session is attached to the
 * given client tty? Null for "" or an unknown tty.
 */
export function sessionForTty(clients: Map<string, string>, tty: string): string | null {
	if (tty === "") return null;
	for (const [session, clientTty] of clients) {
		if (clientTty === tty) return session;
	}
	return null;
}

/**
 * Resolve a user-supplied target string to a single {@link TmuxWindow}.
 *
 * The target is trimmed first; an empty/whitespace-only target returns `null`.
 *
 * Three forms are supported:
 *
 * - `"session:@id#pid"` — tmux's window id plus the server pid (see
 *   {@link TmuxWindow.id}). Matches only the window with that id, on that
 *   server, in exactly that session (case-sensitive, as tmux session names
 *   are). When that window is gone — closed, or the server restarted — it
 *   returns `null`; it never falls back to a name or an index. `@digits`
 *   WITHOUT `#pid` is not this form: it is read as a name, as it always was.
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
		const namePart = trimmed.slice(colon + 1);
		const byId = /^(@\d+)#(\d+)$/.exec(namePart);
		if (byId !== null) {
			const session = trimmed.slice(0, colon);
			const [, id, pid] = byId;
			return windows.find((w) => w.session === session && w.id === id && w.serverPid === pid) ?? null;
		}
		const sessionPart = trimmed.slice(0, colon).toLowerCase();
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

/**
 * The target string that binds a key to exactly window `w`, for capture and
 * for the settings dropdown. `session:name` when that name is unique in the
 * session (it survives a tmux restart and reads well); otherwise
 * `session:@id#pid`, because {@link resolveTarget} takes the FIRST match and a
 * shared name would send the key to a different window — and would move again
 * whenever a same-named window closes. Names and sessions are compared
 * case-insensitively here because the resolver compares them that way.
 * Every candidate is checked by resolving it against `windows`; "" when
 * neither resolves to `w` (only possible without an id or a server pid).
 */
export function exactTargetFor(windows: TmuxWindow[], w: TmuxWindow): string {
	const shared = windows.some(
		(o) =>
			o !== w &&
			o.session.toLowerCase() === w.session.toLowerCase() &&
			o.name.toLowerCase() === w.name.toLowerCase(),
	);
	const candidates = shared ? [] : [`${w.session}:${w.name}`];
	if (w.id !== "" && w.serverPid !== "") candidates.push(`${w.session}:${w.id}#${w.serverPid}`);
	return candidates.find((t) => resolveTarget(windows, t) === w) ?? "";
}

/**
 * The settings dropdown's entries: one per window that some target can name,
 * valued by {@link exactTargetFor}. A window bound by id gets its index in
 * the label, since two same-named entries are otherwise indistinguishable.
 * `skipped` counts windows that could not be offered, for the caller to log.
 */
export function tmuxWindowOptions(windows: TmuxWindow[]): {
	items: { label: string; value: string }[];
	skipped: number;
} {
	const items: { label: string; value: string }[] = [];
	for (const w of windows) {
		const value = exactTargetFor(windows, w);
		if (value === "") continue;
		const byName = value === `${w.session}:${w.name}`;
		items.push({ label: byName ? tmuxWindowLabel(w) : `${tmuxWindowLabel(w)} (window ${w.index})`, value });
	}
	return { items, skipped: windows.length - items.length };
}
