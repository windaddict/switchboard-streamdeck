/**
 * Pure logic for the "cycle windows of the active application" dial. Uses the
 * macOS "Move focus to next window" shortcut (Cmd+`, grave = key code 50),
 * which cycles the frontmost app's windows — no app-specific scripting needed.
 */

import type { RotationDirection } from "./rotation.js";

/** AppleScript to cycle the frontmost app's windows forward/backward. */
export function appWindowCycleScript(direction: Exclude<RotationDirection, "none">): string {
	const modifiers = direction === "next" ? "{command down}" : "{command down, shift down}";
	return `tell application "System Events"
	key code 50 using ${modifiers}
end tell
return "ok"`;
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
