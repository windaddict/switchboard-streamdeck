/**
 * Pure logic for the tmux pane dial: rotate to switch panes, push to leave
 * copy-mode (return the cursor to the live prompt when scrolled up). All
 * functions are tmux-CLI-agnostic strings/args so they unit test without tmux.
 */

import type { RotationDirection } from "./rotation.js";

/**
 * tmux args to select the next/previous pane relative to the current one
 * (`-t +` / `-t -`). Wraps around within the current window.
 */
export function selectPaneArgs(direction: Exclude<RotationDirection, "none">): string[] {
	return ["select-pane", "-t", direction === "next" ? "+" : "-"];
}

/** tmux args to read whether the current pane is in a mode (copy-mode/scrolled up). */
export const PANE_IN_MODE_ARGS = ["display-message", "-p", "#{pane_in_mode}"];

/** tmux args to exit copy-mode — returns the cursor to the live prompt/bottom. */
export const CANCEL_MODE_ARGS = ["send-keys", "-X", "cancel"];

/** Parse `#{pane_in_mode}` output: "1" means the pane is in copy-mode. */
export function paneIsInMode(output: string): boolean {
	return output.trim() === "1";
}
