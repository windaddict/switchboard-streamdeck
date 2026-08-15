import { escapeForAppleScript } from "../applescript/escape.js";

/** iTerm2's bundle identifier (for frontmost-app checks). */
export const ITERM_BUNDLE_ID = "com.googlecode.iterm2";

/**
 * AppleScript returning the tty of iTerm's FOCUSED session — current session
 * of the current tab of the current (front) window — or "" when there is no
 * window. Only run this when iTerm is already frontmost: merely addressing an
 * app via AppleScript launches it.
 */
export const ITERM_FOCUSED_TTY_SCRIPT = `tell application "iTerm"
	try
		return tty of current session of current tab of current window
	on error
		return ""
	end try
end tell`;

export type ITermFocusStatus = "ok" | "notfound" | "timeout" | "error";

export interface ITermFocusResult {
	status: ITermFocusStatus;
	windowId: string;
	tty: string;
}

/** Parse the structured final line emitted by {@link buildITermRaiseScript}. */
export function parseITermFocusResult(output: string): ITermFocusResult {
	const line = output.trim().split("\n").at(-1) ?? "";
	const [status, windowId = "", tty = ""] = line.split("|");
	if (status === "ok" || status === "notfound" || status === "timeout" || status === "error") {
		return { status, windowId, tty };
	}
	return { status: "error", windowId, tty };
}

/**
 * Build AppleScript that activates iTerm and selects the window+tab+session
 * whose `tty` equals the given tty. Selection is verified by stable window id
 * plus focused tty, with a bounded retry for cross-window/Space activation.
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

	return `set targetTty to "${escapedTty}"
set targetWindowId to ""

tell application "iTerm"
	-- Capture a stable window identity before activation changes window order.
	repeat with w in windows
		repeat with t in tabs of w
			repeat with s in sessions of t
				if (tty of s) is targetTty then
					set targetWindowId to id of w
					exit repeat
				end if
			end repeat
			if targetWindowId is not "" then exit repeat
		end repeat
		if targetWindowId is not "" then exit repeat
	end repeat

	if targetWindowId is "" then return "notfound||"

	activate
	set observedWindowId to ""
	set observedTty to ""
	set cleanAttempts to 0
	set lastErrorNumber to ""

	-- Window activation is asynchronous across iTerm windows and Spaces.
	-- Re-resolve by stable id on every attempt, wait for that window to become
	-- current, then make tab/session selection the final write.
	repeat with attempt from 1 to 30
		try
			set targetWindow to first window whose id is targetWindowId
			try
				if miniaturized of targetWindow then set miniaturized of targetWindow to false
			end try
			select targetWindow
			delay 0.05
			set observedWindowId to id of current window
			if observedWindowId is targetWindowId then
				set selectedTarget to false
				set targetWindow to first window whose id is targetWindowId
				repeat with t in tabs of targetWindow
					repeat with s in sessions of t
						if (tty of s) is targetTty then
							tell t to select
							tell s to select
							set selectedTarget to true
							exit repeat
						end if
					end repeat
					if selectedTarget then exit repeat
				end repeat
				delay 0.05
				set observedWindowId to id of current window
				set observedTty to tty of current session of current tab of current window
				if observedWindowId is targetWindowId and observedTty is targetTty and frontmost then
					return "ok|" & observedWindowId & "|" & observedTty
				end if
			end if
			set cleanAttempts to cleanAttempts + 1
		on error errMsg number errNum
			set lastErrorNumber to errNum as text
			-- A window/session can disappear during the transition. The next
			-- bounded attempt re-resolves it; final readback remains diagnostic.
		end try
	end repeat
end tell
if cleanAttempts is 0 and lastErrorNumber is not "" then return "error|" & lastErrorNumber & "|"
return "timeout|" & observedWindowId & "|" & observedTty`;
}
