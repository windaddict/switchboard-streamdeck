/**
 * Detect Claude Code inside tmux windows from the pane title tmux already
 * stores. This is now a FALLBACK signal: the primary source is
 * `claude agents --json` (see claude-agents.ts). Under tmux, Claude Code
 * 2.1.236+ pins a static "✳" title (`tengu_static_title_under_mux`), so the
 * title says nothing there; otherwise it is a spinner frame (braille
 * U+2800–U+28FF, or ◐◑◒◓) while working and "✳" while idle. Pure parsing and
 * decision only.
 */

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
 * spinner frame (U+2800–U+28FF) or a half-circle frame (◐◑◒◓, U+25D0–U+25D3,
 * the 2.1.236+ spinner) followed by a space and the task summary.
 * Trimmed first (identity and state must read the same bytes), and the
 * marker+space shape rejects unrelated TUI titles that merely start with a
 * braille character. */
function startsWithSpinner(title: string): boolean {
	const t = title.trim();
	const cp = t.codePointAt(0);
	const isBraille = cp !== undefined && cp >= 0x2800 && cp <= 0x28ff;
	const isHalfCircle = cp !== undefined && cp >= 0x25d0 && cp <= 0x25d3;
	if (!isBraille && !isHalfCircle) return false;
	return t.length === 1 || t[1] === " ";
}
