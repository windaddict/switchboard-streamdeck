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
