import { escapeForAppleScript } from "../applescript/escape.js";

/**
 * Build AppleScript that activates iTerm and selects the window+tab+session
 * whose `tty` equals the given tty. The script returns "ok" if a match was
 * found and selected, otherwise "notfound".
 *
 * The tty is escaped via {@link escapeForAppleScript} before interpolation so
 * that quotes/backslashes in the value cannot break out of the AppleScript
 * string literal.
 *
 * iTerm2's AppleScript application name is "iTerm". Each iTerm2 session exposes
 * a `tty` property (e.g. "/dev/ttys000").
 *
 * @param tty - The tty device path to match (e.g. "/dev/ttys000").
 * @returns The AppleScript source, or "" when `tty` is empty/whitespace-only
 *          (the caller treats "" as nothing-to-do).
 */
export function buildITermRaiseScript(tty: string): string {
	if (tty.trim() === "") {
		return "";
	}

	const escapedTty = escapeForAppleScript(tty);

	return `tell application "iTerm"
	activate
	repeat with w in windows
		repeat with t in tabs of w
			repeat with s in sessions of t
				if (tty of s) is "${escapedTty}" then
					select w
					tell t to select
					tell s to select
					return "ok"
				end if
			end repeat
		end repeat
	end repeat
end tell
return "notfound"`;
}
