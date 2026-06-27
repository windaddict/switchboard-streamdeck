/**
 * AppleScript generation. Pure string-building so it can be unit-tested without
 * actually invoking osascript. All user-controlled values are escaped before
 * interpolation to avoid AppleScript injection.
 */

import { escapeForAppleScript } from "../applescript/escape.js";
import type { ResolvedTarget } from "./targets.js";

// Re-exported for back-compat: existing tests import escapeForAppleScript here.
export { escapeForAppleScript };

/** Build a title-match clause from a `||`-separated pattern list. */
function titleClause(titlePattern: string | undefined): string {
	if (!titlePattern) return "";
	const parts = titlePattern
		.split("||")
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length === 0) return "";
	const ors = parts.map((p) => `(theName contains "${escapeForAppleScript(p)}")`).join(" or ");
	return ` or ${ors}`;
}

/**
 * Find an existing Safari tab matching the URL pattern (or title fallback),
 * focus it, and raise its window. If none is found, open the URL.
 */
function buildNormalScript(t: ResolvedTarget): string {
	const url = escapeForAppleScript(t.url);
	const pattern = escapeForAppleScript(t.urlPattern);
	const titleMatch = titleClause(t.titlePattern);

	return `tell application "Safari"
	set wasFound to false
	repeat with w in windows
		repeat with tb in tabs of w
			try
				set theURL to URL of tb
			on error
				set theURL to ""
			end try
			try
				set theName to name of tb
			on error
				set theName to ""
			end try
			if (theURL contains "${pattern}")${titleMatch} then
				set current tab of w to tb
				set index of w to 1
				set wasFound to true
				exit repeat
			end if
		end repeat
		if wasFound then exit repeat
	end repeat
	if not wasFound then
		open location "${url}"
	end if
	activate
end tell
return "ok"`;
}

/**
 * Open the URL in a NEW private window. Safari does not expose private-window
 * tabs to AppleScript, so matching an existing private tab is not possible —
 * we always open fresh. Uses the ⌘⇧N menu shortcut via System Events.
 */
function buildPrivateScript(t: ResolvedTarget): string {
	const url = escapeForAppleScript(t.url);
	return `tell application "Safari" to activate
delay 0.2
tell application "System Events"
	keystroke "n" using {command down, shift down}
end tell
delay 0.4
tell application "Safari"
	set URL of front document to "${url}"
	activate
end tell
return "ok"`;
}

/** Build the AppleScript for a resolved target (private or normal). */
export function buildJumpScript(t: ResolvedTarget): string {
	return t.private ? buildPrivateScript(t) : buildNormalScript(t);
}
