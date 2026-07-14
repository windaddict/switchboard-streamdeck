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
	"#{pane_tty}|#{session_name}|#{window_index}|#{pane_active}|#{window_active}|#{pane_current_command}|#{pane_title}",
];

export interface PaneTty {
	tty: string;
	session: string;
	windowIndex: number;
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
		if (fields.length < 7) continue;
		const windowIndex = Number.parseInt(fields[2], 10);
		if (!Number.isFinite(windowIndex)) continue; // malformed line — never raise window 0 from garbage
		panes.push({
			tty: fields[0],
			session: fields[1],
			windowIndex,
			receivesKeys: fields[3] === "1" && fields[4] === "1",
			command: fields[5],
			title: fields.slice(6).join("|"),
		});
	}
	return panes;
}

/** Working/waiting from a pane title's leading marker (braille spinner =
 * working, anything else = waiting); null when no title to judge. */
export function titleWorking(title: string): boolean | null {
	const trimmed = title.trim();
	if (trimmed === "") return null;
	const cp = trimmed.codePointAt(0);
	return cp !== undefined && cp >= 0x2800 && cp <= 0x28ff;
}

/** True when the string starts with a braille pattern char — Claude Code's
 * animated working-spinner frames all live in U+2800–U+28FF. */
function startsWithSpinner(title: string): boolean {
	const cp = title.codePointAt(0);
	return cp !== undefined && cp >= 0x2800 && cp <= 0x28ff;
}

/**
 * Claude Code's state inside one tmux window (matched by session + window
 * name, same as the key's target). Several claude panes in one window:
 * WORKING wins — the key should read busy if anything is busy.
 */
export function claudeStateForWindow(
	panes: PaneInfo[],
	session: string,
	windowName: string,
): ClaudeState {
	let state: ClaudeState = "none";
	for (const p of panes) {
		if (p.session !== session || p.windowName !== windowName) continue;
		if (p.command !== "claude") continue;
		if (startsWithSpinner(p.title)) return "working";
		state = "waiting";
	}
	return state;
}
