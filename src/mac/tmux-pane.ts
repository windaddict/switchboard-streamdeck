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
 * tmux args to select the next/previous pane relative to the current one
 * (`-t +` / `-t -`). Wraps around within the current window.
 */
export function selectPaneArgs(direction: Exclude<RotationDirection, "none">): string[] {
	return ["select-pane", "-t", direction === "next" ? "+" : "-"];
}

/**
 * tmux args reading the current pane/window status for the touchscreen:
 * `command|paneIndex|paneCount|windowName` (window name LAST — it may itself
 * contain `|`, the other fields never do).
 */
export const PANE_STATUS_ARGS = [
	"display-message",
	"-p",
	"#{pane_current_command}|#{pane_index}|#{window_panes}|#{window_name}",
];

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
 * names what rotation moves through (the ⇄ hints the press/tap toggle);
 * `current` shows where you are — the pane's running command with its
 * position, or the window name.
 */
export function paneDialFeedback(
	mode: PaneDialMode,
	status: PaneStatus,
): { mode: string; current: string } {
	if (mode === "windows") {
		return { mode: "Windows ⇄", current: status.windowName || "—" };
	}
	const position = status.paneCount > 0 ? `${status.paneIndex + 1}/${status.paneCount}` : "";
	const current = [status.command, position].filter(Boolean).join(" · ");
	return { mode: "Panes ⇄", current: current || "—" };
}
