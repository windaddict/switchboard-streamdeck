/**
 * Pure logic for the "cycle windows of the active application" dial. Uses the
 * macOS "Move focus to next window" shortcut (Cmd+`, grave = key code 50),
 * which cycles the frontmost app's windows — no app-specific scripting needed.
 *
 * The dial is modal: "windows" cycles the frontmost app's windows, "apps"
 * cycles the visible applications themselves. Press or touch-tap toggles.
 */

import type { RotationDirection } from "./rotation.js";

/** What the dial rotation moves through. */
export type AppWindowsMode = "windows" | "apps";

/** Toggle between cycling windows and cycling applications. */
export function toggleAppWindowsMode(mode: AppWindowsMode): AppWindowsMode {
	return mode === "windows" ? "apps" : "windows";
}

/** AppleScript to cycle the frontmost app's windows forward/backward. */
export function appWindowCycleScript(direction: Exclude<RotationDirection, "none">): string {
	const modifiers = direction === "next" ? "{command down}" : "{command down, shift down}";
	return `tell application "System Events"
	key code 50 using ${modifiers}
end tell
return "ok"`;
}

/**
 * AppleScript to activate the next/previous VISIBLE application. System Events
 * lists visible processes in a stable order; we find the frontmost, step to its
 * neighbour (wrapping), and raise it. Returns the activated app's name.
 */
export function appCycleScript(direction: Exclude<RotationDirection, "none">): string {
	const step = direction === "next" ? "frontIdx + 1" : "frontIdx - 1";
	return `tell application "System Events"
	set procs to application processes whose visible is true
	set n to count of procs
	if n is 0 then return ""
	set frontIdx to 1
	repeat with i from 1 to n
		if frontmost of item i of procs then
			set frontIdx to i
			exit repeat
		end if
	end repeat
	set targetIdx to ${step}
	if targetIdx > n then set targetIdx to 1
	if targetIdx < 1 then set targetIdx to n
	set frontmost of item targetIdx of procs to true
	return name of item targetIdx of procs
end tell`;
}

/**
 * setFeedback payload for the custom `layouts/app-windows.json` layout — OWN
 * item keys, because the built-in $B1 layout's `title` item is bound to the
 * user-editable action title and silently ignores plugin pushes. `mode` names
 * what rotation moves through; `current` shows where you are — the window
 * title (falling back to the app name for title-less windows) or the
 * frontmost app.
 */
export function appWindowsFeedback(
	mode: AppWindowsMode,
	front: FrontWindow,
): { mode: string; current: string } {
	if (mode === "apps") {
		return { mode: "Apps ⇄", current: front.app || "—" };
	}
	return { mode: "Windows ⇄", current: front.title || front.app || "—" };
}

/** AppleScript returning `appName|frontWindowTitle` for the frontmost app. */
export const FRONT_WINDOW_SCRIPT = `tell application "System Events"
	set p to first application process whose frontmost is true
	set appName to name of p
	if (count of windows of p) is 0 then return appName & "|"
	return appName & "|" & (name of front window of p)
end tell`;

// A `type` (not interface) so it satisfies JsonValue when used in settings.
export type FrontWindow = {
	app: string;
	title: string;
};

/** Parse `app|title` (title may contain further `|`, kept intact). */
export function parseFrontWindow(output: string): FrontWindow {
	const out = output.trim();
	const i = out.indexOf("|");
	if (i < 0) return { app: out, title: "" };
	return { app: out.slice(0, i), title: out.slice(i + 1) };
}
