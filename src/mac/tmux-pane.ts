/**
 * Pure logic for the tmux pane dial: rotate to switch panes — or, after a
 * press/touch-tap toggles the mode, tmux windows — from one dial. All
 * functions are tmux-CLI-agnostic strings/args so they unit test without tmux.
 */

import type { RotationDirection } from "./rotation.js";

/** What the dial rotation moves through. */
export type PaneDialMode = "panes" | "windows";

/** Toggle between switching panes and switching windows (press or tap). */
export function togglePaneDialMode(mode: PaneDialMode): PaneDialMode {
	return mode === "panes" ? "windows" : "panes";
}

/**
 * tmux args to select the next/previous pane. Untargeted (`-t +`) tmux acts on
 * ITS notion of the current session — which may not be the one in the
 * frontmost macOS window. Pass `session` to scope the move to that session's
 * current window (`-t "sess:.+"`). Wraps around within the window.
 */
export function selectPaneArgs(
	direction: Exclude<RotationDirection, "none">,
	session?: string | null,
): string[] {
	const sign = direction === "next" ? "+" : "-";
	return ["select-pane", "-t", session ? `${session}:.${sign}` : sign];
}

const PANE_STATUS_FORMAT = "#{pane_current_command}|#{pane_index}|#{window_panes}|#{window_name}";

/**
 * tmux args reading the pane/window status for the touchscreen:
 * `command|paneIndex|paneCount|windowName` (window name LAST — it may itself
 * contain `|`, the other fields never do). Scoped to `session` when given, for
 * the same reason as {@link selectPaneArgs}.
 */
export function paneStatusArgs(session?: string | null): string[] {
	return session
		? ["display-message", "-p", "-t", session, PANE_STATUS_FORMAT]
		: ["display-message", "-p", PANE_STATUS_FORMAT];
}

export type PaneStatus = {
	command: string;
	paneIndex: number;
	paneCount: number;
	windowName: string;
};

/** Parse {@link PANE_STATUS_ARGS} output; missing fields degrade to ""/0. */
export function parsePaneStatus(output: string): PaneStatus {
	const fields = output.trim().split("|");
	return {
		command: fields[0] ?? "",
		paneIndex: Number.parseInt(fields[1] ?? "", 10) || 0,
		paneCount: Number.parseInt(fields[2] ?? "", 10) || 0,
		windowName: fields.slice(3).join("|"),
	};
}

/**
 * setFeedback payload for the shared `layouts/mode-dial.json` layout. `mode`
 * names what rotation moves through (the ⇄ hints the press/tap toggle) in the
 * tmux family's phosphor — the "tmux" prefix and colour distinguish this dial
 * from the look-alike macOS App Windows dial. `current` shows where you are —
 * the pane's running command with its position, or the window name.
 */
export function paneDialFeedback(
	mode: PaneDialMode,
	status: PaneStatus,
): { mode: { value: string; color: string }; current: string } {
	if (mode === "windows") {
		return {
			mode: { value: "tmux Windows ⇄", color: "#3ECF6E" },
			current: status.windowName || "—",
		};
	}
	const position = status.paneCount > 0 ? `${status.paneIndex + 1}/${status.paneCount}` : "";
	const current = [status.command, position].filter(Boolean).join(" · ");
	return { mode: { value: "tmux Panes ⇄", color: "#3ECF6E" }, current: current || "—" };
}
