/**
 * Terminal.app scripting for the Claude Project key: read the focused tab's
 * tty and raise the window+tab hosting a given tty. Verified against the
 * Terminal sdef: tabs expose read-only `tty`, windows a settable
 * `selected tab` / `frontmost`. Only address Terminal when it is RUNNING —
 * `tell application "Terminal"` would launch it.
 */

import { escapeForAppleScript } from "../applescript/escape.js";

export const TERMINAL_BUNDLE_ID = "com.apple.Terminal";
/** Process name for the running check (pgrep -x). */
export const TERMINAL_PROCESS_NAME = "Terminal";

/** AppleScript returning the tty of Terminal's focused tab, or "". */
export const TERMINAL_FOCUSED_TTY_SCRIPT = `tell application "Terminal"
	try
		if (count of windows) is 0 then return ""
		return tty of selected tab of front window
	on error
		return ""
	end try
end tell`;

/**
 * AppleScript that selects the Terminal window+tab whose tty matches, raises
 * it, and activates Terminal. Returns "ok" or "notfound".
 */
export function buildTerminalRaiseScript(tty: string): string {
	if (tty.trim() === "") {
		return "";
	}
	const escapedTty = escapeForAppleScript(tty);
	return `tell application "Terminal"
	repeat with w in windows
		repeat with t in tabs of w
			if (tty of t) is "${escapedTty}" then
				set selected tab of w to t
				set frontmost of w to true
				activate
				return "ok"
			end if
		end repeat
	end repeat
end tell
return "notfound"`;
}
