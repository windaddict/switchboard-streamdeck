/**
 * WHAT IT'S FOR: the FIRST-CHOICE route for the Paste Snippet key's two
 * gestures — reading and writing the frontmost app's actual text-control
 * selection through the Accessibility API (`AXSelectedText`), via System
 * Events. Its whole reason to exist is that `clipboard-snippet.ts`'s ⌘C/⌘V
 * route, while universal, ALWAYS touches the system clipboard — displacing
 * whatever the operator had copied, and racing their clipboard manager
 * (CopyBug) over who writes last. Confirmed live in iTerm2 (`AXSelectedText`
 * present, real selection text returned): when an app exposes its selection
 * this way, neither gesture needs to touch the clipboard at all. Confirmed
 * ALSO live that Safari and ChatGPT's web content do not expose
 * `AXSelectedText` on their focused element at all — for those, and anything
 * else that doesn't support it, the clipboard route in `clipboard-snippet.ts`
 * remains the fallback. This module only decides "can accessibility help
 * here right now," and if so, does the read/write; the fallback wiring lives
 * in the action (`../actions/paste-snippet.ts`).
 *
 * ASK, DON'T INFER. A naive version would just try to read `AXSelectedText`
 * and treat any thrown error as "unsupported." That's wrong: reading a
 * missing/unset attribute raises DIFFERENT AppleEvent errors in different
 * states (-1700 "can't make some data into the expected type", -1728
 * "can't get object", and sometimes no error at all with an empty result) —
 * there's no reliable way to tell "this app doesn't support selections" apart
 * from "it supports them and none is selected" by pattern-matching a thrown
 * error. So {@link READ_SELECTION_SCRIPT} asks the question directly instead:
 * it fetches the focused element's attribute NAMES and checks whether
 * `"AXSelectedText"` is even in the list, before ever trying to read its
 * value. Only once presence is confirmed does an empty/missing value get
 * reported as "nothing is selected" (`nosel`) rather than "not supported"
 * (`unsupported`) — and that distinction is exactly what the routing rule
 * below depends on.
 *
 * FRAMING (read): a short status word on the FIRST LINE — `ok`, `unsupported`,
 * `nosel`, or `err|<n>` — and, for `ok` only, EVERYTHING after the first
 * newline is the selection text, verbatim. Deliberately not base64: a
 * previous attempt tried `do shell script "..." with input` (not a real
 * AppleScript form) and separately assumed `Buffer.from(x, "base64")` throws
 * on malformed input, which it does not — a try/catch "safety net" around it
 * would have been dead code. Status-line framing needs no such net: it is
 * verified (this module's tests, plus a real `osascript` run while building
 * it) to survive quotes, backslashes, tabs, `|`, embedded newlines, accented
 * characters and emoji. Only the single trailing newline `osascript` itself
 * appends is stripped — the payload is never trimmed beyond that, because
 * trimming would eat leading/trailing whitespace the operator actually
 * selected.
 *
 * ERROR NUMBERS ONLY CROSS THE BOUNDARY. AppleScript's `errMsg` can quote the
 * very content a script failed on (e.g. while trying to set a value); neither
 * script ever returns it, and neither this module nor its caller ever logs
 * it. Only `errNum` (an OS-level integer) and status words travel back.
 *
 * THE WRITE SIDE TAKES THE TEXT ONLY AS ARGV. {@link WRITE_SELECTION_SCRIPT}
 * reads `item 1 of argv` inside `on run argv` — never interpolated into the
 * script source — via {@link runAppleScriptWithArgs}, the one mechanism in
 * this codebase where arguments are delivered as data a script must opt into
 * reading, never as code.
 */

import type { RunResult } from "../applescript/runner.js";

/**
 * AppleScript: ask whether the frontmost app's focused UI element exposes
 * `AXSelectedText` at all, and if so, read it. See the module header for why
 * this asks rather than infers from a failed read.
 */
export const READ_SELECTION_SCRIPT = `try
	tell application "System Events"
		set frontProc to first application process whose frontmost is true
		tell frontProc
			try
				set theElement to value of attribute "AXFocusedUIElement"
			on error
				return "unsupported"
			end try
			if theElement is missing value then return "unsupported"
			try
				set attrNames to name of attributes of theElement
			on error
				return "unsupported"
			end try
			if attrNames does not contain "AXSelectedText" then return "unsupported"
			try
				set theText to value of attribute "AXSelectedText" of theElement
			on error
				return "nosel"
			end try
			if theText is missing value then return "nosel"
			if theText is "" then return "nosel"
			return "ok" & linefeed & theText
		end tell
	end tell
on error errMsg number errNum
	return "err|" & errNum
end try`;

/**
 * AppleScript: write `argv[1]` into `AXSelectedText` on the frontmost app's
 * focused element, i.e. replace the current selection with it. Same
 * ask-don't-infer shape as the read script (existence-checked before the
 * write is attempted), and the same `ok` / `unsupported` / `err|<n>` framing
 * — there is no payload to carry back, so there is nothing after the status
 * word.
 */
export const WRITE_SELECTION_SCRIPT = `on run argv
	set theText to item 1 of argv
	try
		tell application "System Events"
			set frontProc to first application process whose frontmost is true
			tell frontProc
				try
					set theElement to value of attribute "AXFocusedUIElement"
				on error
					return "unsupported"
				end try
				if theElement is missing value then return "unsupported"
				-- Ask whether the element can hold a text selection at all before
				-- trying to set one. Inferring it from a failed write would
				-- conflate "this app cannot do this" (fall back to the clipboard)
				-- with "the write itself failed" — and the fallback decision
				-- depends on telling those apart.
				try
					set attrNames to name of attributes of theElement
				on error
					return "unsupported"
				end try
				if attrNames does not contain "AXSelectedText" then return "unsupported"
				try
					set value of attribute "AXSelectedText" of theElement to theText
				on error
					return "unsupported"
				end try
			end tell
		end tell
		return "ok"
	on error errMsg number errNum
		return "err|" & errNum
	end try
end run`;

/** Strip only the single trailing newline `osascript` appends to every
 * result — never more. Trimming further would eat whitespace that is part
 * of an actual selection. */
function stripTrailingNewline(raw: string): string {
	return raw.endsWith("\n") ? raw.slice(0, -1) : raw;
}

export type AxReadResult =
	| { status: "ok"; text: string }
	/** The focused element doesn't expose `AXSelectedText` (or there is no
	 * focused element at all, or System Events itself couldn't be reached) —
	 * accessibility genuinely cannot help here. */
	| { status: "unsupported" }
	/** The attribute exists, but there is currently nothing selected. */
	| { status: "nosel" }
	/** The script ran and hit an AppleEvent error while probing; `code` is the
	 * OS-level error NUMBER only — never the message. */
	| { status: "error"; code: number }
	/** Output didn't match any known shape at all — treated the same as
	 * `error` by the routing rule (we couldn't tell), never as `ok`. */
	| { status: "malformed" };

/** Parse {@link READ_SELECTION_SCRIPT}'s raw stdout. See the module header
 * for the exact framing this depends on. */
export function parseAxRead(rawOutput: string): AxReadResult {
	const output = stripTrailingNewline(rawOutput);
	const firstNewline = output.indexOf("\n");
	const head = firstNewline === -1 ? output : output.slice(0, firstNewline);

	if (head === "unsupported") return { status: "unsupported" };
	if (head === "nosel") return { status: "nosel" };
	const err = /^err\|(-?\d+)$/.exec(head);
	if (err) return { status: "error", code: Number(err[1]) };
	if (head === "ok") {
		// The script's framing guarantees a payload line after "ok", even
		// though it can never be empty (an empty/missing selection is framed
		// as "nosel", not "ok" with nothing after it). No payload line at all
		// means the output is garbled — never treated as a successful read.
		if (firstNewline === -1) return { status: "malformed" };
		return { status: "ok", text: output.slice(firstNewline + 1) };
	}
	return { status: "malformed" };
}

export type AxWriteResult =
	| { status: "ok" }
	| { status: "unsupported" }
	| { status: "error"; code: number }
	| { status: "malformed" };

/** Parse {@link WRITE_SELECTION_SCRIPT}'s raw stdout — a bare status word,
 * no payload. */
export function parseAxWrite(rawOutput: string): AxWriteResult {
	const output = stripTrailingNewline(rawOutput).trim();
	if (output === "ok") return { status: "ok" };
	if (output === "unsupported") return { status: "unsupported" };
	const err = /^err\|(-?\d+)$/.exec(output);
	if (err) return { status: "error", code: Number(err[1]) };
	return { status: "malformed" };
}

export type AxDeps = {
	runAppleScript(script: string): Promise<RunResult>;
	runAppleScriptWithArgs(script: string, args: readonly string[]): Promise<RunResult>;
	/** Structural logging only — outcome codes and OS-level error NUMBERS.
	 * NEVER selection/snippet text or an AppleScript error MESSAGE. */
	log?(message: string): void;
};

/**
 * Run {@link READ_SELECTION_SCRIPT} and parse its result. A failure at the
 * `osascript` process level itself (distinct from the script's own
 * try/catch, which already turns every internal failure into a framed
 * status word) is reported as `malformed` — there is no error NUMBER to
 * carry in that case, only the runner's own classification, which is logged
 * directly since it is already sanitized (`classifyError` never carries the
 * AppleScript message).
 */
export async function captureViaAx(deps: AxDeps): Promise<AxReadResult> {
	const result = await deps.runAppleScript(READ_SELECTION_SCRIPT);
	if (!result.ok) {
		deps.log?.(`ax-read: osascript failed (code=${result.code})`);
		return { status: "malformed" };
	}
	const parsed = parseAxRead(result.stdout);
	if (parsed.status === "malformed") {
		deps.log?.("ax-read: unparseable output");
	} else if (parsed.status === "error") {
		deps.log?.(`ax-read: script reported error ${parsed.code}`);
	}
	return parsed;
}

/**
 * Run {@link WRITE_SELECTION_SCRIPT} with `content` delivered as an argv
 * element (never interpolated) and parse its result. Same `malformed`
 * handling as {@link captureViaAx} for a process-level failure.
 */
export async function insertViaAx(content: string, deps: AxDeps): Promise<AxWriteResult> {
	const result = await deps.runAppleScriptWithArgs(WRITE_SELECTION_SCRIPT, [content]);
	if (!result.ok) {
		deps.log?.(`ax-write: osascript failed (code=${result.code})`);
		return { status: "malformed" };
	}
	const parsed = parseAxWrite(result.stdout);
	if (parsed.status === "malformed") {
		deps.log?.("ax-write: unparseable output");
	} else if (parsed.status === "error") {
		deps.log?.(`ax-write: script reported error ${parsed.code}`);
	}
	return parsed;
}

export type CaptureRoute = "use-ax" | "fall-back";

/**
 * THE FALLBACK RULE, as a pure function over an {@link AxReadResult} — no
 * I/O, so it's testable without a single mock. Exact mapping:
 *   - `ok` -> `use-ax` (the clipboard is never touched).
 *   - everything else (`unsupported`, `nosel`, `error`, `malformed`) ->
 *     `fall-back` to the clipboard capture.
 *
 * Only a SUCCESSFUL read skips the clipboard; see the comment in the body for
 * why `nosel` in particular is a fall-back and not a refusal.
 */
export function decideCaptureRoute(ax: AxReadResult): CaptureRoute {
	// ONLY a successful read skips the clipboard. Everything else falls back,
	// including `nosel`.
	//
	// `nosel` used to mean "accessibility can see selections here and there
	// isn't one", so firing ⌘C was assumed pointless. MEASURED ON THE REAL
	// MACHINE: iTerm2 reports `nosel` even with text selected — the attribute
	// exists and stays empty — while ⌘C copies that selection perfectly. So the
	// old rule blocked the one mechanism that worked. A ⌘C with nothing
	// selected is harmless (the pasteboard does not move and we report
	// no-copy); refusing to try is not.
	return ax.status === "ok" ? "use-ax" : "fall-back";
}

export type InsertRoute = "use-ax" | "fall-back";

/**
 * Insert ALWAYS goes through the clipboard.
 *
 * The accessibility write cannot be verified: setting `AXSelectedText` returns
 * success when the call does not error, which is not the same as text landing.
 * MEASURED: iTerm2 accepts the write, reports ok, and inserts nothing — three
 * times in a row, while the operator saw no change. An unverifiable mechanism
 * that reports confident success is worse than one that touches the clipboard,
 * so `insertViaAx` is retained only for tests and is not on the live path.
 */
export function decideInsertRoute(): InsertRoute {
	return "fall-back";
}
