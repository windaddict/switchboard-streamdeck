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
 * Split a URL match pattern into ordered literal segments on `*` wildcards.
 *
 * A pattern with no `*` yields a single segment, which matches as a plain
 * substring (so existing non-wildcard patterns are unchanged). `*` stands for
 * any run of characters; matching requires the segments to appear in order but
 * is not anchored (it still matches anywhere in the URL).
 *
 * Examples: `"a/b"` -> `["a/b"]`; `"mail.google.com/u/*​/inbox"` ->
 * `["mail.google.com/u/", "/inbox"]`; `"*"` / `""` -> `[]` (matches anything).
 */
export function wildcardSegments(pattern: string): string[] {
	return pattern.split("*").filter((segment) => segment.length > 0);
}

/** Render segments as an AppleScript list literal of escaped strings. */
function segmentsListLiteral(segments: string[]): string {
	return `{${segments.map((s) => `"${escapeForAppleScript(s)}"`).join(", ")}}`;
}

/**
 * Find an existing Safari tab matching the URL pattern (or title fallback),
 * focus it, and raise its window. If none is found, open the URL. The URL match
 * supports `*` wildcards via an ordered-segment containment check.
 */
function buildNormalScript(t: ResolvedTarget): string {
	const url = escapeForAppleScript(t.url);
	const segs = segmentsListLiteral(wildcardSegments(t.urlPattern));
	const titleMatch = titleClause(t.titlePattern);

	return `on urlMatches(u)
	set segs to ${segs}
	set startIdx to 1
	set uLen to (length of u)
	repeat with seg in segs
		set s to (seg as text)
		if s is not "" then
			if startIdx > uLen then return false
			set f to offset of s in (text startIdx thru uLen of u)
			if f is 0 then return false
			set startIdx to startIdx + f + (length of s) - 1
		end if
	end repeat
	return true
end urlMatches

tell application "Safari"
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
			if (my urlMatches(theURL))${titleMatch} then
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
 * tabs to AppleScript, so matching an existing private tab is not possible — we
 * always open fresh via the ⌘⇧N menu shortcut.
 *
 * Safety: rather than a fixed `delay` then blindly writing `front document`
 * (which, if the private window opened slowly, would navigate the user's CURRENT
 * tab), we record the front document's URL first, then poll until it changes —
 * meaning a new window actually became frontmost. We only set the URL once a new
 * window appears (or when there was nothing to protect), so a slow ⌘⇧N can never
 * clobber an existing tab.
 */
function buildPrivateScript(t: ResolvedTarget): string {
	const url = escapeForAppleScript(t.url);
	return `tell application "Safari"
	activate
	try
		set prevURL to (URL of front document)
	on error
		set prevURL to ""
	end try
end tell
tell application "System Events"
	keystroke "n" using {command down, shift down}
end tell
tell application "Safari"
	set waited to 0
	set newURL to prevURL
	repeat until (newURL is not prevURL) or (waited > 40)
		delay 0.05
		set waited to waited + 1
		try
			set newURL to (URL of front document)
		on error
			set newURL to prevURL
		end try
	end repeat
	if (newURL is not prevURL) or (prevURL is "") then
		set URL of front document to "${url}"
		activate
	end if
end tell
return "ok"`;
}

/** Build the AppleScript for a resolved target (private or normal). */
export function buildJumpScript(t: ResolvedTarget): string {
	return t.private ? buildPrivateScript(t) : buildNormalScript(t);
}
