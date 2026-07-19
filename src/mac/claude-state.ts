/**
 * Detect Claude Code inside tmux windows — and whether it is WORKING or
 * WAITING for input — from signals tmux already captures. Claude Code sets
 * the terminal title (OSC), which tmux stores as `pane_title`: while working
 * the title starts with an animated braille spinner frame (U+2800–U+28FF);
 * while idle at the prompt it starts with a static "✳". Presence is
 * `pane_current_command == "claude"`. Pure parsing/decision only.
 */

/** tmux args listing every pane as `session|windowIndex|windowName|command|title`
 * (title LAST — it is a task summary and may itself contain `|`). */
export const LIST_PANES_ARGS = [
	"list-panes",
	"-a",
	"-F",
	"#{session_name}|#{window_index}|#{window_name}|#{pane_current_command}|#{pane_title}",
];

export interface PaneInfo {
	session: string;
	windowIndex: number;
	windowName: string;
	command: string;
	title: string;
}

/** Parse {@link LIST_PANES_ARGS} output; malformed lines are skipped. */
export function parsePanes(output: string): PaneInfo[] {
	const panes: PaneInfo[] = [];
	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line === "") continue;
		const fields = line.split("|");
		if (fields.length < 5) continue;
		panes.push({
			session: fields[0],
			windowIndex: Number.parseInt(fields[1], 10) || 0,
			windowName: fields[2],
			command: fields[3],
			title: fields.slice(4).join("|"),
		});
	}
	return panes;
}

export type ClaudeState = "working" | "waiting" | "none";

/** tmux args listing every pane as `paneTty|session|windowIndex|command|title`
 * (title LAST — it may contain `|`). Pane ttys identify tmux-hosted processes:
 * they are invisible to iTerm/Terminal tab lists, so a raise-by-tty must
 * detect them here and route through the tmux machinery instead. */
export const LIST_PANE_TTYS_ARGS = [
	"list-panes",
	"-a",
	"-F",
	"#{pane_tty}|#{session_name}|#{window_index}|#{window_name}|#{pane_active}|#{window_active}|#{pane_current_command}|#{pane_title}",
];

export interface PaneTty {
	tty: string;
	session: string;
	windowIndex: number;
	windowName: string;
	/** This pane is the active pane of its window AND that window is the
	 * session's current one — i.e. an attached, focused client would type here. */
	receivesKeys: boolean;
	command: string;
	title: string;
}

/** Parse {@link LIST_PANE_TTYS_ARGS} output; malformed lines are skipped. */
export function parsePaneTtys(output: string): PaneTty[] {
	const panes: PaneTty[] = [];
	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line === "") continue;
		const fields = line.split("|");
		if (fields.length < 8) continue;
		const windowIndex = Number.parseInt(fields[2], 10);
		if (!Number.isFinite(windowIndex)) continue; // malformed line — never raise window 0 from garbage
		panes.push({
			tty: fields[0],
			session: fields[1],
			windowIndex,
			windowName: fields[3],
			receivesKeys: fields[4] === "1" && fields[5] === "1",
			command: fields[6],
			title: fields.slice(7).join("|"),
		});
	}
	return panes;
}

/** Working/waiting from a pane title's leading marker (braille spinner =
 * working, anything else = waiting); null when no title to judge. */
export function titleWorking(title: string): boolean | null {
	const trimmed = title.trim();
	if (trimmed === "") return null;
	return startsWithSpinner(trimmed);
}

/** True when the title matches Claude Code's WORKING format: a braille
 * spinner frame (U+2800–U+28FF) followed by a space and the task summary.
 * Trimmed first (identity and state must read the same bytes), and the
 * marker+space shape rejects unrelated TUI titles that merely start with a
 * braille character. */
function startsWithSpinner(title: string): boolean {
	const t = title.trim();
	const cp = t.codePointAt(0);
	if (cp === undefined || cp < 0x2800 || cp > 0x28ff) return false;
	return t.length === 1 || t[1] === " ";
}

/**
 * Claude Code's state inside one tmux window (matched by session + window
 * name, same as the key's target). Several claude panes in one window:
 * WORKING wins — the key should read busy if anything is busy.
 */
export function claudeStateForWindow(
	panes: Array<Pick<PaneInfo, "session" | "windowName" | "command" | "title">>,
	session: string,
	windowName: string,
): ClaudeState {
	let state: ClaudeState = "none";
	for (const p of panes) {
		if (p.session !== session || p.windowName !== windowName) continue;
		// command === "claude" is the authoritative identity. The ONE sanctioned
		// fallback: a WORKING-format title (braille frame + space) on a pane
		// whose foreground command is a tool — Claude's OSC title persists while
		// a foreground shell tool momentarily owns the tty. The fallback is
		// deliberately braille-only: a stale ✳ on a dead/reused pane must never
		// be adopted as a waiting Claude forever.
		if (p.command !== "claude") {
			if (startsWithSpinner(p.title)) return "working";
			continue;
		}
		if (startsWithSpinner(p.title)) return "working";
		state = "waiting";
	}
	return state;
}

/** Does this window contain a pane whose tty hosts a shell-busy claude?
 * Feeds the tmux keys the "turn ended but a background shell still runs"
 * case, where the pane title reads ✳ (waiting). */
export function windowShellBusy(
	panes: Array<Pick<PaneTty, "tty" | "session" | "windowName">>,
	session: string,
	windowName: string,
	busyTtys: ReadonlySet<string>,
): boolean {
	return panes.some(
		(p) => p.session === session && p.windowName === windowName && busyTtys.has(p.tty),
	);
}

/** A pane title that could belong to Claude (braille spinner OR the ✳ idle
 * marker) — used only to LOCATE a claude pane for the cwd lookup, never to
 * decide working/waiting. */
function startsWithSpinnerOrStar(title: string): boolean {
	const t = title.trim();
	const cp = t.codePointAt(0);
	if (cp === undefined) return false;
	return cp === 0x2733 || (cp >= 0x2800 && cp <= 0x28ff);
}

/** The project cwds of EVERY claude pane in a window (panes whose command is
 * claude OR whose title carries Claude's marker), via a tty→cwd map — so the
 * tmux keys can read those projects' transcripts for the Brewing signal. A
 * split window can host more than one claude; any working one should light
 * the key, so all are returned (deduped). Empty when none matched. */
export function windowClaudeCwds(
	panes: Array<Pick<PaneTty, "tty" | "session" | "windowName" | "command" | "title">>,
	session: string,
	windowName: string,
	ttyToCwd: ReadonlyMap<string, string>,
): string[] {
	const cwds = new Set<string>();
	for (const p of panes) {
		if (p.session !== session || p.windowName !== windowName) continue;
		if (p.command !== "claude" && !startsWithSpinnerOrStar(p.title)) continue;
		const cwd = ttyToCwd.get(p.tty);
		if (cwd) cwds.add(cwd);
	}
	return [...cwds];
}
