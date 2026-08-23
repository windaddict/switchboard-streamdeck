/**
 * WHAT IT'S FOR: capturing the operator's current text selection into the
 * "Paste Snippet" key, and pasting it back out — through the system
 * clipboard, on purpose.
 *
 * This is the FALLBACK route. The first choice, tried before any of this
 * runs, is `ax-text.ts`'s Accessibility route (`AXSelectedText` on the
 * frontmost app's focused element) — it never touches the clipboard at all,
 * confirmed live in iTerm2. This module exists because that route isn't
 * universal: Safari and ChatGPT's web content don't expose `AXSelectedText`
 * on their focused element at all (probed live — Safari's focused element
 * exposed 42 Accessibility attributes, and that wasn't one of them). The
 * routing decision itself (`decideCaptureRoute`/`decideInsertRoute` in
 * `ax-text.ts`) lives outside this module; this module is just what runs
 * once that decision says "fall back."
 *
 * So this module goes through ⌘C / ⌘V — but explicitly WITHOUT saving and
 * restoring whatever was on the clipboard before. The operator said plainly
 * that this key changing the clipboard is fine. That one decision is what
 * makes the rest of this simple: no snapshot-and-restore, no race against a
 * clipboard manager over who gets to write last, no "restore clobbered an
 * image I had copied." Capture leaves the just-copied text on the clipboard;
 * insert leaves the snippet on the clipboard. Neither ever restores anything.
 *
 * Both directions go through small, single-purpose AppleScript/JXA scripts,
 * run via the shared osascript runner (`../applescript/runner.js`). Every one
 * of them has been extracted and actually executed against a real Mac while
 * writing this module — this is not "should work," it is "was run."
 *
 * Two rules hold throughout, because breaking either leaks the operator's
 * text into a place it must never go:
 *   - Snippet/clipboard text is NEVER interpolated into a script. It travels
 *     only as a JXA process's STDIN (write) or as a script's stdout (read) —
 *     never spliced into source, never passed as an argv element either (argv
 *     has a real OS length ceiling a 32 KiB snippet can approach).
 *   - No selection text, snippet text, preview, or AppleScript/JXA error
 *     MESSAGE ever reaches a call to `log`. Only outcome codes, byte counts,
 *     and (non-secret) OS-level numbers — a changeCount, a bundle id — are
 *     logged. An AppleScript error message can quote the content it failed
 *     on, which is exactly why only error NUMBERS survive
 *     (`classifyError` in `../applescript/runner.js`), never the message.
 *
 * FRAMING, used by every script that returns non-trivial data: a short status
 * word (plus, where useful, a piece of non-secret numeric context) on the
 * FIRST LINE; for the one status that carries a payload, EVERYTHING after the
 * first newline is that payload, verbatim. Deliberately not base64: the
 * payload is arbitrary user text, so any in-band delimiter could occur inside
 * it, whereas "before the first newline" is the one thing the status word
 * itself cannot do. Verified end to end (see the module's test suite and the
 * commands run while building this) that quotes, backslashes, tabs, `|`,
 * embedded newlines, accents and emoji all survive the round trip intact.
 *
 * KNOWN LIMITS, stated plainly:
 *   - Capture refuses when macOS itself reports Secure Input is on, and when
 *     the copied item carries `org.nspasteboard.ConcealedType` (the marker
 *     password managers use). It CANNOT recognise every secret — a field
 *     that doesn't set either signal (plenty don't) is copied like any other.
 *   - Before sending ⌘V, insert re-reads the pasteboard's changeCount and
 *     requires it to still equal the one OUR write produced. That is an exact
 *     check that nothing else has written since — not a lock: another process
 *     can still write in the instant between that read and the keystroke.
 *   - The frontmost-app check before pasting is a MITIGATION, not a
 *     guarantee: it catches the operator switching apps between our write and
 *     our ⌘V, not every way focus could move in that gap.
 *   - Nothing here can tell a genuine, isolated pasteboard change (the
 *     operator's own ⌘C) apart from some OTHER process changing the
 *     clipboard in the same instant. A clipboard manager that reacts to a
 *     copy by promptly re-touching the pasteboard (adding its own metadata)
 *     is exactly what `churn` below is for — but a change that lands in the
 *     narrow window BEFORE our own ⌘C is not distinguishable from our
 *     result, and is not detected.
 */

import type { RunResult } from "../applescript/runner.js";
import { withinSizeCap } from "./snippet.js";

/** How long the capture poll waits for the ⌘C we just sent to land, in ms. */
const CAPTURE_POLL_DEADLINE_MS = 1200;
/** How often the capture poll checks the pasteboard's changeCount, in ms. */
const CAPTURE_POLL_INTERVAL_MS = 50;

/**
 * JXA: ask Carbon whether Secure Input is currently on. Refusing ONLY when
 * this affirmatively says "true" (never when the probe fails or returns
 * something unexpected) is deliberate: false alarms would make the key
 * unusable, so the rule is "refuse only when we KNOW the field is secure."
 * Verified live: `osascript -l JavaScript -e '<this>'` printed "false" in a
 * normal Terminal window.
 */
export const SECURE_INPUT_PROBE_SCRIPT = `function run() {
	ObjC.import("Carbon");
	try {
		return String($.IsSecureEventInputEnabled());
	} catch (e) {
		return "probe-failed";
	}
}`;

/** JXA: read the general pasteboard's `changeCount` — a plain, non-secret
 * integer used as a before/after fingerprint. Never the pasteboard's content. */
export const READ_CHANGE_COUNT_SCRIPT = `function run() {
	ObjC.import("AppKit");
	try {
		return String($.NSPasteboard.generalPasteboard.changeCount);
	} catch (e) {
		return "read-failed";
	}
}`;

/** JXA: read the frontmost application's bundle identifier — again, a plain
 * non-secret string, used only to notice "the frontmost app changed." Empty
 * output means "couldn't tell," never a real bundle id. */
export const READ_FRONTMOST_BUNDLE_SCRIPT = `function run() {
	ObjC.import("AppKit");
	try {
		var bid = $.NSWorkspace.sharedWorkspace.frontmostApplication.bundleIdentifier;
		var unwrapped = ObjC.unwrap(bid);
		return unwrapped === null || unwrapped === undefined ? "" : unwrapped;
	} catch (e) {
		return "";
	}
}`;

/** AppleScript: the ⌘C the capture gesture sends. */
export const COPY_KEYSTROKE_SCRIPT = `tell application "System Events" to keystroke "c" using {command down}`;

/** AppleScript: the ⌘V the insert gesture sends. Intentionally NOT executed
 * during development/verification (it would fire into whatever is
 * frontmost) — only compiled. */
export const PASTE_KEYSTROKE_SCRIPT = `tell application "System Events" to keystroke "v" using {command down}`;

/**
 * JXA, given the pre-⌘C `changeCount` as `argv[0]`: poll the pasteboard
 * (every {@link CAPTURE_POLL_INTERVAL_MS}ms, up to {@link CAPTURE_POLL_DEADLINE_MS}ms)
 * until it changes, then snapshot its TYPES and TEXT together in one pass,
 * then re-read `changeCount` a third time to catch a TORN read — something
 * (our own ⌘C, or another process) changing the pasteboard again while we
 * were mid-snapshot. A single external process, not a JS-side poll loop:
 * the whole wait-then-snapshot happens inside one `osascript` invocation, so
 * there is nothing for this module's own timers to coordinate.
 *
 * Output, per the module's framing: `unchanged|<n>` (nothing changed within
 * the deadline — the ⌘C copied nothing), `churn|<n>` (changed again during
 * the snapshot — refuse, don't guess which write is real), `readfail|<n>`
 * (changed, but reading it threw), or `ok|<comma-joined types>` + LINEFEED +
 * the raw text (verbatim; empty when the pasteboard has no plain-text
 * representation at all — the JS side decides what that means).
 *
 * Verified live end-to-end: a background poll of this exact loop correctly
 * caught a real pasteboard write (including multi-byte emoji) made by a
 * second process ~150-300ms after the poll started.
 */
export const CAPTURE_POLL_SCRIPT = `function run(argv) {
	ObjC.import("AppKit");
	ObjC.import("Foundation");
	var baseline = parseInt(argv[0], 10);
	var pb = $.NSPasteboard.generalPasteboard;
	var deadline = Date.now() + ${CAPTURE_POLL_DEADLINE_MS};
	var cur = pb.changeCount;
	var changed = false;
	while (Date.now() < deadline) {
		cur = pb.changeCount;
		if (cur !== baseline) { changed = true; break; }
		$.NSThread.sleepForTimeInterval(${CAPTURE_POLL_INTERVAL_MS / 1000});
	}
	if (!changed) return "unchanged|" + cur;
	var types, text;
	try {
		var nsTypes = pb.types;
		types = [];
		var count = nsTypes.count;
		for (var i = 0; i < count; i++) {
			types.push(ObjC.unwrap(nsTypes.objectAtIndex(i)));
		}
		var nsText = pb.stringForType("public.utf8-plain-text");
		text = nsText.isNil() ? null : ObjC.unwrap(nsText);
	} catch (e) {
		return "readfail|" + pb.changeCount;
	}
	var after = pb.changeCount;
	if (after !== cur) return "churn|" + after;
	return "ok|" + types.join(",") + "\\n" + (text === null ? "" : text);
}`;

/**
 * JXA, reading the snippet text from STDIN (never argv, never script
 * source): write it to the pasteboard as a `NSPasteboardItem` carrying THREE
 * representations on the same item — `public.utf8-plain-text` (the text
 * itself), plus `org.nspasteboard.ConcealedType` and
 * `org.nspasteboard.TransientType` (empty marker data; their PRESENCE, not
 * their content, is what clipboard managers and Universal Clipboard look for
 * to skip retaining/syncing an entry). Every ObjC call that can fail is
 * checked explicitly and reported as a distinct `fail-*` code — nothing here
 * assumes success.
 *
 * Verified live: after running this exact script with real UTF-8 (including
 * emoji) piped to its stdin, `pbpaste` read the text back correctly and a
 * fresh read of the pasteboard's types showed BOTH marker types present
 * alongside `public.utf8-plain-text`.
 */
export const WRITE_SNIPPET_SCRIPT = `function run() {
	ObjC.import("AppKit");
	ObjC.import("Foundation");
	var nsString;
	try {
		var data = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
		if (!data) return "fail-stdin";
		nsString = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding);
		if (!nsString) return "fail-decode";
	} catch (e) {
		return "fail-stdin";
	}
	try {
		var pb = $.NSPasteboard.generalPasteboard;
		var token = $.NSUUID.UUID.UUIDString.js;
		pb.clearContents;
		var item = $.NSPasteboardItem.alloc.init;
		var okText = item.setStringForType(nsString, "public.utf8-plain-text");
		if (!okText) return "fail-write-text";
		var emptyData = $.NSData.alloc.init;
		var okConcealed = item.setDataForType(emptyData, "org.nspasteboard.ConcealedType");
		if (!okConcealed) return "fail-write-concealed";
		var okTransient = item.setDataForType(emptyData, "org.nspasteboard.TransientType");
		if (!okTransient) return "fail-write-transient";
		// A per-write ownership token on a private type. changeCount alone
		// cannot prove the item on the pasteboard is OURS: reading the count
		// after writeObjects is not atomic with it, so a writer landing in
		// between yields a count that describes THEIR write and then never
		// moves again. Reading this token back identifies the item itself.
		var okToken = item.setStringForType($(token), ${JSON.stringify("com.movingavg.switchboard.snippet-token")});
		if (!okToken) return "fail-write-token";
		var wrote = pb.writeObjects($([item]));
		if (!wrote) return "fail-writeobjects";
		return "ok " + pb.changeCount + " " + token;
	} catch (e) {
		return "fail-write";
	}
}`;

/** The private pasteboard type carrying {@link WRITE_SNIPPET_SCRIPT}'s
 * per-write ownership token. Private to this plugin: no other app reads or
 * writes it, so finding our exact token there means our exact item is still
 * the current pasteboard contents. */
export const SNIPPET_TOKEN_TYPE = "com.movingavg.switchboard.snippet-token";

/**
 * JXA: read back the ownership token written by {@link WRITE_SNIPPET_SCRIPT}.
 * Returns the token (a UUID string — never content) or "none". Run
 * immediately before ⌘V: it answers "is the item I wrote still what will be
 * pasted?", which changeCount equality alone cannot.
 */
export const READ_SNIPPET_TOKEN_SCRIPT = `function run() {
	ObjC.import("AppKit");
	try {
		var pb = $.NSPasteboard.generalPasteboard;
		var value = pb.stringForType(${JSON.stringify("com.movingavg.switchboard.snippet-token")});
		if (!value) return "none";
		var js = value.js;
		return js ? js : "none";
	} catch (e) {
		return "none";
	}
}`;

/** Parse {@link SECURE_INPUT_PROBE_SCRIPT}'s output. Anything other than an
 * exact "true"/"false" is "unknown" — including a thrown/caught probe — so
 * the caller can apply "refuse only when we KNOW it's secure." */
export function parseSecureInputProbe(output: string): "secure" | "not-secure" | "unknown" {
	const trimmed = output.trim();
	if (trimmed === "true") return "secure";
	if (trimmed === "false") return "not-secure";
	return "unknown";
}

/** Parse a plain-integer script result (changeCount). Null on anything that
 * isn't exactly an integer — never coerced, never guessed. */
export function parseChangeCount(output: string): number | null {
	const trimmed = output.trim();
	return /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Parse {@link READ_FRONTMOST_BUNDLE_SCRIPT}'s output. Empty means
 * "couldn't tell," represented as null so callers can't mistake it for a
 * real (if oddly empty) bundle id. */
/** Every `fail-*` code {@link WRITE_SNIPPET_SCRIPT} can return, plus the two
 * this module synthesises. An EXACT allowlist, not a pattern: a value is
 * logged because it is one of these, never because it merely looks like one. */
const WRITE_FAIL_CODES: ReadonlySet<string> = new Set([
	"fail-stdin",
	"fail-decode",
	"fail-write-text",
	"fail-write-concealed",
	"fail-write-transient",
	"fail-write-token",
	"fail-writeobjects",
	"fail-write",
	"empty",
	"bad-changecount",
	"incomplete-write-receipt",
]);

/**
 * Reduce any string bound for a LOG LINE to a token we can prove is safe.
 *
 * WHY: every value this feature logs comes from a child process's stdout, and
 * this action's whole contract is that the operator's selection text never
 * reaches a log at any level. A `fail-*` code and a bundle id are safe to log
 * because of their SHAPE, not because of where they came from — an osascript
 * that emits a warning, a partial read, or an unexpected error puts arbitrary
 * text in the same field. Anything that is not a short, identifier-shaped,
 * dot/dash-separated token becomes "unrecognised": the log keeps its
 * diagnostic value for the codes that matter and cannot carry content.
 */
export function safeLogToken(value: string): string {
	const trimmed = value.trim();
	return /^[A-Za-z0-9][A-Za-z0-9._-]{0,47}$/.test(trimmed) ? trimmed : "unrecognised";
}

export function parseBundleId(output: string): string | null {
	const trimmed = output.trim();
	return trimmed === "" ? null : trimmed;
}

export type CapturePollResult =
	| { status: "unchanged"; changeCount: number }
	| { status: "churn"; changeCount: number }
	| { status: "readfail"; changeCount: number }
	| { status: "ok"; types: string[]; text: string };

/** Parse {@link CAPTURE_POLL_SCRIPT}'s output. Null on anything that isn't
 * exactly one of the four framed shapes — a garbled or partial osascript
 * result must never be read as a real capture. */
export function parseCapturePoll(output: string): CapturePollResult | null {
	const body = output.endsWith("\n") ? output.slice(0, -1) : output;
	const split = body.indexOf("\n");
	const head = split === -1 ? body : body.slice(0, split);

	const unchanged = /^unchanged\|(-?\d+)$/.exec(head);
	if (unchanged) return { status: "unchanged", changeCount: Number(unchanged[1]) };
	const churn = /^churn\|(-?\d+)$/.exec(head);
	if (churn) return { status: "churn", changeCount: Number(churn[1]) };
	const readfail = /^readfail\|(-?\d+)$/.exec(head);
	if (readfail) return { status: "readfail", changeCount: Number(readfail[1]) };

	const ok = /^ok\|(.*)$/.exec(head);
	if (ok) {
		// "ok|..." with no LF at all is malformed — the framing guarantees a
		// payload line, even if that payload is empty.
		if (split === -1) return null;
		const types = ok[1] === "" ? [] : ok[1].split(",");
		return { status: "ok", types, text: body.slice(split + 1) };
	}
	return null;
}

/** Parse {@link WRITE_SNIPPET_SCRIPT}'s output: exactly "ok", or any
 * `fail-*` (or garbled/empty) reason — never partially trusted. */
export function parseWriteResult(
	output: string,
): { ok: true; changeCount: number; token: string } | { ok: false; reason: string } {
	const trimmed = output.trim();
	// A success MUST carry BOTH the changeCount the write produced and the
	// ownership token. A bare "ok" is not accepted: it would satisfy the
	// caller's success check while silently skipping the pre-⌘V ownership
	// verification those two values exist to make possible.
	const parts = /^ok (-?\d+) ([0-9A-Fa-f-]{36})$/.exec(trimmed);
	if (parts) {
		const count = Number(parts[1]);
		if (Number.isSafeInteger(count)) return { ok: true, changeCount: count, token: parts[2] };
		return { ok: false, reason: "bad-changecount" };
	}
	if (/^ok\b/.test(trimmed)) return { ok: false, reason: "incomplete-write-receipt" };
	// The reason is logged, so it passes through the shape check: the script's
	// own `fail-*` codes survive it, anything unexpected does not.
	// An EXACT allowlist. A shape check would pass through any identifier-shaped
	// stdout — including one that happens to be a short secret — so an
	// unexpected value is reported as "unrecognised" and the value itself is
	// dropped rather than logged.
	if (trimmed === "") return { ok: false, reason: "empty" };
	return { ok: false, reason: WRITE_FAIL_CODES.has(trimmed) ? trimmed : "unrecognised" };
}

export type ClipboardDeps = {
	runAppleScript(script: string): Promise<RunResult>;
	runJxa(script: string): Promise<RunResult>;
	runJxaWithArgs(script: string, args: readonly string[]): Promise<RunResult>;
	runJxaWithStdin(script: string, input: string): Promise<RunResult>;
	/** Structural logging only — outcome codes, byte counts, and non-secret
	 * OS-level numbers/ids. NEVER the clipboard/snippet text, a preview of
	 * it, or an AppleScript/JXA error MESSAGE. */
	log?(message: string): void;
};

export type CaptureOutcome =
	| { status: "ok"; content: string }
	/** macOS reports Secure Input is on — a password field is likely focused. */
	| { status: "secure-input" }
	/** The ⌘C never changed the pasteboard within the deadline — nothing was selected. */
	| { status: "no-selection" }
	/** The pasteboard changed again while we were reading it — refuse rather than guess which write is real. */
	| { status: "churn" }
	/** The pasteboard changed, but reading its contents threw. */
	| { status: "read-fail" }
	/** The copied item carries `org.nspasteboard.ConcealedType` (a password-manager marker). */
	| { status: "concealed" }
	/** The copied item has no `public.utf8-plain-text` representation at all. */
	| { status: "not-text" }
	| { status: "too-big" }
	| { status: "permission-denied" }
	| { status: "error"; detail?: string };

export type InsertOutcome =
	| { status: "ok" }
	| { status: "too-big" }
	/** The write script ran, but reported a `fail-*` (or unreadable) result. */
	| { status: "write-failed"; detail: string }
	/** The pasteboard's changeCount did not advance past our pre-write baseline — refusing to send ⌘V onto stale/unknown clipboard state. */
	| { status: "not-confirmed" }
	/** The frontmost app changed between our write and the paste keystroke (a mitigation, not a guarantee — see the module header). */
	| { status: "frontmost-changed" }
	/** Something else wrote to the pasteboard after our write and before ⌘V, so
	 * the paste would have inserted THAT instead of the snippet. */
	| { status: "clobbered" }
	| { status: "permission-denied" }
	| { status: "error"; detail?: string };

async function readChangeCount(deps: ClipboardDeps): Promise<number | null> {
	const result = await deps.runJxa(READ_CHANGE_COUNT_SCRIPT);
	if (!result.ok) {
		deps.log?.(`clipboard: could not read changeCount (code=${result.code})`);
		return null;
	}
	return parseChangeCount(result.stdout);
}

async function readFrontmostBundleId(deps: ClipboardDeps): Promise<string | null> {
	const result = await deps.runJxa(READ_FRONTMOST_BUNDLE_SCRIPT);
	if (!result.ok) {
		deps.log?.(`clipboard: could not read the frontmost app (code=${result.code})`);
		return null;
	}
	return parseBundleId(result.stdout);
}

/**
 * Read whatever the operator just selected, for the long-press "teach the
 * button" gesture: refuse Secure Input and password-manager copies, send
 * ⌘C, wait for the pasteboard to reflect it, and validate the result before
 * ever returning it to the caller for storage. NEVER restores whatever was
 * on the clipboard before — that is intentional (see the module header) —
 * and refuses rather than stores on anything short of a confirmed, in-cap,
 * plain-text, non-concealed capture.
 */
export async function captureSnippet(deps: ClipboardDeps): Promise<CaptureOutcome> {
	const secureResult = await deps.runJxa(SECURE_INPUT_PROBE_SCRIPT);
	if (secureResult.ok) {
		const probe = parseSecureInputProbe(secureResult.stdout);
		if (probe === "secure") {
			deps.log?.("capture: refused — Secure Input is on (a password field is likely focused)");
			return { status: "secure-input" };
		}
		if (probe === "unknown") {
			deps.log?.("capture: secure-input probe returned an unexpected result; proceeding");
		}
	} else {
		deps.log?.(`capture: secure-input probe failed (code=${secureResult.code}); proceeding`);
	}

	const baseline = await readChangeCount(deps);
	if (baseline === null) {
		deps.log?.("capture: refused — could not read the clipboard's baseline changeCount");
		return { status: "error", detail: "baseline-unreadable" };
	}

	const copyResult = await deps.runAppleScript(COPY_KEYSTROKE_SCRIPT);
	if (!copyResult.ok) {
		if (copyResult.code === "permission-denied") {
			deps.log?.("capture: permission-denied sending ⌘C");
			return { status: "permission-denied" };
		}
		deps.log?.(`capture: ⌘C keystroke failed (code=${copyResult.code})`);
		return { status: "error", detail: copyResult.code };
	}

	const pollResult = await deps.runJxaWithArgs(CAPTURE_POLL_SCRIPT, [String(baseline)]);
	if (!pollResult.ok) {
		if (pollResult.code === "permission-denied") {
			deps.log?.("capture: permission-denied reading the clipboard");
			return { status: "permission-denied" };
		}
		deps.log?.(`capture: poll script failed (code=${pollResult.code})`);
		return { status: "error", detail: pollResult.code };
	}

	const parsed = parseCapturePoll(pollResult.stdout);
	if (parsed === null) {
		deps.log?.("capture: refused — unparseable poll output");
		return { status: "error", detail: "unparseable" };
	}
	switch (parsed.status) {
		case "unchanged":
			deps.log?.(`capture: nothing was copied (changeCount stayed at ${parsed.changeCount})`);
			return { status: "no-selection" };
		case "churn":
			deps.log?.(`capture: refused — clipboard changed again mid-read (changeCount ${parsed.changeCount})`);
			return { status: "churn" };
		case "readfail":
			deps.log?.("capture: refused — could not read the clipboard after the copy");
			return { status: "read-fail" };
		case "ok": {
			if (parsed.types.includes("org.nspasteboard.ConcealedType")) {
				deps.log?.("capture: refused — copied item is marked concealed (likely a password manager)");
				return { status: "concealed" };
			}
			if (!parsed.types.includes("public.utf8-plain-text")) {
				deps.log?.("capture: refused — no plain text on the clipboard after the copy");
				return { status: "not-text" };
			}
			// EXACTLY empty is treated as nothing copied, not as a capture of
			// "". Storing it would overwrite the operator's existing snippet
			// with nothing — a destructive result from a gesture that found no
			// selection. Whitespace-only text is NOT empty and is kept: they
			// may well have meant to capture an indent (the blank key face
			// exists precisely to show that).
			if (parsed.text === "") {
				deps.log?.("capture: nothing was copied (the clipboard carried plain text, but it was empty)");
				return { status: "no-selection" };
			}
			if (!withinSizeCap(parsed.text)) {
				deps.log?.(`capture: refused — selection is ${Buffer.byteLength(parsed.text, "utf8")} bytes, over the size cap`);
				return { status: "too-big" };
			}
			deps.log?.(`capture: ok (${Buffer.byteLength(parsed.text, "utf8")} bytes)`);
			return { status: "ok", content: parsed.text };
		}
	}
}

/**
 * Write `content` onto the clipboard (marked concealed + transient so
 * clipboard managers and sync skip retaining it) and send ⌘V — the "press"
 * gesture. Confirms the write actually landed (changeCount advanced) before
 * ever sending the paste keystroke, and best-effort-checks the frontmost app
 * hasn't changed out from under it. Leaves the snippet on the clipboard
 * afterward — never restores anything (see the module header).
 */
export async function insertSnippet(content: string, deps: ClipboardDeps): Promise<InsertOutcome> {
	if (!withinSizeCap(content)) {
		deps.log?.(`insert: refused — content is ${Buffer.byteLength(content, "utf8")} bytes, over the size cap`);
		return { status: "too-big" };
	}

	const beforeBundle = await readFrontmostBundleId(deps);
	const beforeChangeCount = await readChangeCount(deps);

	const writeResult = await deps.runJxaWithStdin(WRITE_SNIPPET_SCRIPT, content);
	if (!writeResult.ok) {
		if (writeResult.code === "permission-denied") {
			deps.log?.("insert: permission-denied writing the clipboard");
			return { status: "permission-denied" };
		}
		deps.log?.(`insert: write script failed (code=${writeResult.code})`);
		return { status: "error", detail: writeResult.code };
	}
	const written = parseWriteResult(writeResult.stdout);
	if (!written.ok) {
		deps.log?.(`insert: refused — write reported ${written.reason}`);
		return { status: "write-failed", detail: written.reason };
	}

	const afterChangeCount = await readChangeCount(deps);
	if (beforeChangeCount === null || afterChangeCount === null || !(afterChangeCount > beforeChangeCount)) {
		deps.log?.("insert: refused — clipboard changeCount did not advance past our pre-write baseline; not sending ⌘V");
		return { status: "not-confirmed" };
	}

	// Best-effort only (see module header): only abort when BOTH reads
	// succeeded and disagree. An unreadable frontmost app on either side
	// can't tell us anything, so it doesn't block the paste.
	const afterBundle = await readFrontmostBundleId(deps);
	if (beforeBundle !== null && afterBundle !== null && beforeBundle !== afterBundle) {
		deps.log?.("insert: refused — frontmost app changed since the write (mitigation, not a guarantee)");
		return { status: "frontmost-changed" };
	}

	// Confirm OUR OWN write is still what the pasteboard holds, at the last
	// moment we can check. Everything above proves the write happened; only this proves it
	// has not since been replaced — by a clipboard manager, another app, or the
	// operator — in the window between the write and the keystroke. Without it
	// ⌘V can paste a stranger's content into wherever the cursor is.
	const nowChangeCount = await readChangeCount(deps);
	if (nowChangeCount === null || nowChangeCount !== written.changeCount) {
		deps.log?.("insert: refused — the pasteboard changed after our write; not sending ⌘V");
		return { status: "clobbered" };
	}
	// Identity, not just stability: read our own per-write token back. This is
	// what catches a writer that landed between writeObjects and our reading of
	// changeCount — their write would give us a count that then never moves,
	// passing the check above while the pasteboard holds THEIR content.
	const tokenRead = await deps.runJxa(READ_SNIPPET_TOKEN_SCRIPT);
	const token = tokenRead.ok ? tokenRead.stdout.trim() : "";
	if (token !== written.token) {
		deps.log?.("insert: refused — the pasteboard does not hold our own write; not sending ⌘V");
		return { status: "clobbered" };
	}

	const pasteResult = await deps.runAppleScript(PASTE_KEYSTROKE_SCRIPT);
	if (!pasteResult.ok) {
		if (pasteResult.code === "permission-denied") {
			deps.log?.("insert: permission-denied sending ⌘V");
			return { status: "permission-denied" };
		}
		deps.log?.(`insert: ⌘V keystroke failed (code=${pasteResult.code})`);
		return { status: "error", detail: pasteResult.code };
	}
	deps.log?.(`insert: ok (${Buffer.byteLength(content, "utf8")} bytes)`);
	return { status: "ok" };
}
