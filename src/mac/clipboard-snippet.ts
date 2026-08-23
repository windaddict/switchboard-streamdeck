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
 * So this module goes through ⌘C / ⌘V — and therefore takes the operator's
 * clipboard away from them for the duration. It gives it back: both gestures
 * save what was on the clipboard first and restore it afterwards, via
 * `pasteboard-stash.ts`. That module's header carries the exact guarantee and
 * every limit; the short version is that it is an eager byte-for-byte
 * reconstruction, it declines to touch a clipboard a password manager marked
 * secret, and it abandons the restore rather than clobbering something the
 * operator copied mid-gesture.
 *
 * The insert side is the delicate one, and the reason is worth stating here
 * rather than only where the constant lives: nothing in macOS reports that
 * the app you pasted into has finished READING the pasteboard, so the restore
 * waits a fixed interval after ⌘V and hopes. Measured on this machine, a real
 * app read within 25ms even under load, and the wait is ~48x that — but an
 * app that reads later than the wait gets the RESTORED clipboard instead of
 * the snippet, silently. That is why restoration is a per-key setting that
 * can be turned off, and why the wait is generous.
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
 *     clipboard in the same instant. This is why capture's "ok" result is
 *     treated as the best available evidence of ownership rather than proof
 *     of it: an app that wrote to the clipboard on its own between our
 *     baseline read and our ⌘C looks exactly like the source app answering.
 *     Such a write can therefore be captured into the key AND overwritten by
 *     the restore. No correlation mechanism exists — a keystroke leaves no
 *     mark on the resulting pasteboard item — so this is stated rather than
 *     solved. A clipboard manager that reacts to a
 *     copy by promptly re-touching the pasteboard (adding its own metadata)
 *     is exactly what `churn` below is for — but a change that lands in the
 *     narrow window BEFORE our own ⌘C is not distinguishable from our
 *     result, and is not detected.
 */

import type { RunResult } from "../applescript/runner.js";
import {
	releaseStash,
	restoreClipboard,
	snapshotClipboard,
	type SnapshotResult,
} from "./pasteboard-stash.js";
import { withinSizeCap } from "./snippet.js";

/**
 * Whether this gesture should put the operator's clipboard back afterwards.
 *
 * Default ON — the key's job is to move a snippet, not to cost the operator
 * whatever they were carrying. Off restores the behaviour this module shipped
 * with: the gesture's text simply stays on the clipboard. The escape hatch
 * exists because the INSERT side's restore is timed rather than confirmed
 * (see `insertSnippet`), so an app that reads the pasteboard unusually late
 * needs a way to opt out per key.
 */
export type ClipboardRestoreOptions = {
	restoreClipboard?: boolean;
	/** Called when the clipboard was CLEARED and could not be written back —
	 * the operator has actually lost something and needs telling, not a log
	 * line they will never read. Every other restore outcome (abandoned,
	 * failed before the clear) leaves their clipboard intact and stays a log. */
	onClipboardLost?(): void;
};

/** Insert's extra knobs, all of them injected so the timing is testable
 * without a real clock. */
export type InsertOptions = ClipboardRestoreOptions & {
	/** Called once the ⌘V keystroke has been posted, before the restore wait —
	 * so the key can flash OK immediately instead of a second later. */
	onPasted?(): void;
	/** Overrides {@link RESTORE_AFTER_PASTE_MS}. */
	restoreDelayMs?: number;
	/** Overrides the real timer. */
	wait?(ms: number): Promise<void>;
};

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
	// The changeCount rides along on the ok line so the caller knows which
	// pasteboard state its own ⌘C produced — that is the value the clipboard
	// restore checks against before putting the operator's clipboard back.
	// A UTI cannot contain "|", so the extra field cannot collide with the
	// type list, and the payload is still everything after the first newline.
	return "ok|" + types.join(",") + "|" + Number(after) + "\\n" + (text === null ? "" : text);
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
export const WRITE_SNIPPET_SCRIPT = `function run(argv) {
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
		// BUILD FIRST, CLEAR LAST. Every one of the checked calls below can
		// fail, and clearing before them would leave the operator with an
		// EMPTY clipboard and us with a fail code — destroying what they had
		// in order to report that we could not replace it.
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

		// The LAST-MOMENT baseline check, inside this one process, immediately
		// before the clear. The caller checked the clipboard too, but a whole
		// osascript launch ago; anything copied in that gap would be destroyed
		// here without ever being noticed. -1 disables the check.
		var expected = Number(argv[0]);
		if (expected >= 0 && Number(pb.changeCount) !== expected) return "stale " + Number(pb.changeCount);

		// From here the clipboard is gone until writeObjects lands, so retry
		// rather than giving up on one failure.
		for (var attempt = 0; attempt < 3; attempt++) {
			pb.clearContents;
			if (pb.writeObjects($([item]))) return "ok " + Number(pb.changeCount) + " " + token;
		}
		return "fail-after-clear";
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
	"fail-after-clear",
	"stale-baseline",
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
	| { status: "ok"; types: string[]; text: string; changeCount: number };

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

	const ok = /^ok\|(.*)\|(-?\d+)$/.exec(head);
	if (ok) {
		// "ok|..." with no LF at all is malformed — the framing guarantees a
		// payload line, even if that payload is empty.
		if (split === -1) return null;
		const changeCount = Number(ok[2]);
		if (!Number.isSafeInteger(changeCount)) return null;
		const types = ok[1] === "" ? [] : ok[1].split(",");
		return { status: "ok", types, text: body.slice(split + 1), changeCount };
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
	// The clipboard moved between the caller's check and the script's own, so
	// the write was abandoned BEFORE the clear — the operator's clipboard is
	// untouched and their newer copy is intact.
	if (/^stale(\s|$)/.test(trimmed)) return { ok: false, reason: "stale-baseline" };
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
	/** For WRITE_SNIPPET_SCRIPT alone: the snippet goes via stdin, the
	 * pasteboard baseline it must check goes via argv. */
	runJxaWithArgsAndStdin(script: string, args: readonly string[], input: string): Promise<RunResult>;
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
/**
 * Capture, wrapped in the clipboard save/restore.
 *
 * The secure-input probe deliberately runs BEFORE the snapshot: if we are
 * going to refuse the gesture outright, we should not have touched the
 * operator's clipboard at all.
 *
 * The restore runs in a `finally`, so it covers every refusal — concealed,
 * not-text, churn, too-big — and not just the happy path. A gesture that
 * refuses to store anything should still leave the clipboard as it found it.
 */
export async function captureSnippet(
	deps: ClipboardDeps,
	opts: ClipboardRestoreOptions = {},
): Promise<CaptureOutcome> {
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

	const snapshot =
		opts.restoreClipboard === false
			? ({ status: "none", reason: "disabled" } as const)
			: await snapshotClipboard(deps);
	const state: GestureState = { snapshot, ours: null, restored: false };
	try {
		return await captureAfterSnapshot(deps, state);
	} finally {
		await finishGesture(deps, state, opts);
	}
}

async function captureAfterSnapshot(deps: ClipboardDeps, state: GestureState): Promise<CaptureOutcome> {
	const baseline = await readChangeCount(deps);
	// Same staleness rule as insert: a copy landing between the save and this
	// read makes the stash a picture of the past, and restoring it would
	// destroy that newer copy.
	if (!snapshotStillValid(state.snapshot, baseline, deps)) {
		await releaseStash(deps);
		state.snapshot = { status: "none", reason: "stale" };
	}
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
		// NEITHER churn NOR readfail establishes whose content is on the
		// clipboard. `churn` means a SECOND write landed after the one our ⌘C
		// produced — quite possibly the operator copying something themselves —
		// and `readfail` means we could not see what is there at all. Restoring
		// over either would overwrite a state we do not own, so both leave
		// `state.ours` null: the stash is released and the clipboard left as it
		// is. That is the pre-restore behaviour, which is safe, not lossy.
		case "churn":
			deps.log?.(`capture: refused — clipboard changed again mid-read (changeCount ${parsed.changeCount})`);
			return { status: "churn" };
		case "readfail":
			deps.log?.("capture: refused — could not read the clipboard after the copy");
			return { status: "read-fail" };
		case "ok": {
			// The best evidence available, which is not proof. A single stable
			// change after our ⌘C is ASSUMED to be our ⌘C: nothing correlates a
			// pasteboard write with the keystroke that caused it, so an app
			// that copied something of its own in this window is
			// indistinguishable from the source app answering us. Irreducible
			// — see the module header. churn and readfail do not even reach
			// this bar and establish nothing.
			state.ours = parsed.changeCount;
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
export async function insertSnippet(
	content: string,
	deps: ClipboardDeps,
	opts: InsertOptions = {},
): Promise<InsertOutcome> {
	if (!withinSizeCap(content)) {
		deps.log?.(`insert: refused — content is ${Buffer.byteLength(content, "utf8")} bytes, over the size cap`);
		return { status: "too-big" };
	}

	// Save the operator's clipboard BEFORE we take it over.
	//
	// Note the deliberate interaction with our own writes: the snippet we put
	// on the clipboard is marked ConcealedType, and a concealed clipboard is
	// never stashed. So if a previous gesture's restore was abandoned and left
	// our snippet sitting there, this snapshot declines — which is exactly
	// right, because the only thing it could have saved is our own snippet.
	const snapshot =
		opts.restoreClipboard === false
			? ({ status: "none", reason: "disabled" } as const)
			: await snapshotClipboard(deps);
	// Whether the restore already ran (and released the stash with it). A local
	// holder, not a flag on the caller's options object: mutating an argument
	// the caller might reuse across gestures is a side channel waiting to go
	// wrong.
	// One mutable record of the gesture's clipboard state, shared with the body
	// so the cleanup below sees what the body learned:
	//   snapshot — dropped to "none" if it turns out to be stale;
	//   ours     — the pasteboard state OUR write produced, set only once the
	//              clipboard is PROVEN to hold it, since several refusals
	//              happen after the snippet is already there;
	//   restored — set when the restore already ran and released the stash.
	const state: GestureState = { snapshot, ours: null, restored: false };
	try {
		return await insertAfterSnapshot(content, deps, opts, state);
	} finally {
		await finishGesture(deps, state, opts);
	}
}

/** What a gesture has learned about the clipboard, shared between the body and
 * its cleanup. */
type GestureState = {
	snapshot: SnapshotResult;
	/** The changeCount our own write/copy produced, once established. Null
	 * means we never proved the clipboard holds our content, so restoring
	 * would be writing over a state we do not own. */
	ours: number | null;
	/** ⌘V has been posted, so some app may be about to read the clipboard. Any
	 * restore from here on must wait first, including one reached through the
	 * cleanup path after something threw. */
	pasted?: boolean;
	restored: boolean;
};

/**
 * The single exit path for a gesture's clipboard handling: restore if we may,
 * and give the stash back whatever happened.
 *
 * A stash that outlives its gesture is a copy of the operator's data sitting
 * somewhere they don't know about, so the release is unconditional — with ONE
 * deliberate exception, inside `restoreClipboard`: a restore that failed after
 * clearing the clipboard keeps the stash, because at that moment it holds the
 * only surviving copy.
 */
async function finishGesture(
	deps: ClipboardDeps,
	state: GestureState,
	opts: InsertOptions,
): Promise<void> {
	if (state.snapshot.status !== "stashed" || state.restored) return;
	if (state.pasted && state.ours !== null) {
		// Reached only when the normal post-paste path was cut short by a
		// throw. The keystroke is still out there, so the delay applies just
		// the same.
		await waitBeforeRestore(deps, opts);
	}
	if (state.ours === null) {
		// Nothing of ours is on the clipboard, so there is nothing to undo.
		await releaseStash(deps);
		return;
	}
	await finishRestore(deps, state.snapshot, state.ours, opts);
}

/** How long to wait after posting ⌘V before putting the clipboard back.
 *
 * MEASURED, not guessed. A scratch TextEdit document was given a real ⌘V while
 * the clipboard was swapped after a controlled delay, and the resulting text
 * says which content it actually read: at 0ms it read the swapped-in value
 * every time (the silent wrong paste this delay exists to prevent), and from
 * 25ms upward it read the snippet every time — including with the machine
 * under a load average of ~10.
 *
 * 1200ms is ~48x that observed latency. The margin is deliberately generous
 * because the measurement covers one native app on one Mac, and a remote
 * session, a VM or a beachballed app can be far slower. The costs of waiting
 * longer are small and bounded: the clipboard holds the snippet for that much
 * longer, and a second gesture waits. The cost of waiting too little is the
 * operator pasting something they never asked for. */
export const RESTORE_AFTER_PASTE_MS = 1200;

async function insertAfterSnapshot(
	content: string,
	deps: ClipboardDeps,
	opts: InsertOptions,
	state: GestureState,
): Promise<InsertOutcome> {
	const beforeBundle = await readFrontmostBundleId(deps);
	const beforeChangeCount = await readChangeCount(deps);
	// The snapshot is only good if the clipboard has not moved since it was
	// taken. If somebody copied something in that gap, the stash holds the
	// state BEFORE their copy, and restoring it later would silently destroy
	// what they just copied — the exact loss this feature exists to prevent.
	// Their copy wins: we drop the stash and leave the clipboard alone.
	if (!snapshotStillValid(state.snapshot, beforeChangeCount, deps)) {
		await releaseStash(deps);
		state.snapshot = { status: "none", reason: "stale" };
	}

	// The script re-checks this immediately before it clears the clipboard. -1
	// when we could not read a baseline at all: the check is a protection, not
	// a precondition, and refusing to paste because we could not read a number
	// would be a worse failure than the one it guards against.
	const writeResult = await deps.runJxaWithArgsAndStdin(
		WRITE_SNIPPET_SCRIPT,
		[String(beforeChangeCount ?? -1)],
		content,
	);
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
		if (written.reason === "fail-after-clear") {
			// The clipboard was cleared and could not be rewritten. We still
			// hold the operator's clipboard in the stash, and nothing but us
			// has touched the pasteboard, so claim the current state and let
			// the cleanup put their content back.
			deps.log?.("insert: the clipboard was cleared but the snippet could not be written; restoring what was there");
			state.ours = await readChangeCount(deps);
		}
		deps.log?.(`insert: refused — write reported ${written.reason}`);
		return { status: "write-failed", detail: written.reason };
	}

	const afterChangeCount = await readChangeCount(deps);
	if (beforeChangeCount === null || afterChangeCount === null || !(afterChangeCount > beforeChangeCount)) {
		deps.log?.("insert: refused — clipboard changeCount did not advance past our pre-write baseline; not sending ⌘V");
		return { status: "not-confirmed" };
	}

	// Read the frontmost app FIRST, but do not act on it yet. It is an awaited
	// subprocess, and putting it between the ownership check and ⌘V would
	// reopen the very window that check exists to close — the token would be
	// "verified" a whole osascript launch before the keystroke it guards.
	const afterBundle = await readFrontmostBundleId(deps);

	// Confirm OUR OWN write is still what the pasteboard holds, at the last
	// moment we can check. Everything above proves the write happened; only
	// this proves it has not since been replaced — by a clipboard manager,
	// another app, or the operator. Without it ⌘V can paste a stranger's
	// content into wherever the cursor is.
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

	// PROVEN OURS. Only past this point may we put the operator's clipboard
	// back: a `clobbered` refusal above means the clipboard holds SOMEBODY
	// ELSE'S write, and restoring over that would destroy a copy that is very
	// possibly the operator's own — turning a refusal into the exact data loss
	// this whole feature exists to prevent.
	state.ours = written.changeCount;

	// Now act on the frontmost reading taken above. Best-effort only (see the
	// module header): abort only when BOTH reads succeeded and disagree.
	if (beforeBundle !== null && afterBundle !== null && beforeBundle !== afterBundle) {
		deps.log?.("insert: refused — frontmost app changed since the write (mitigation, not a guarantee)");
		return { status: "frontmost-changed" };
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
	// Recorded BEFORE anything that can throw. The cleanup reads it to know the
	// restore must not happen without the delay: a callback that throws or an
	// injected timer that rejects would otherwise drop straight into the
	// cleanup and restore instantly, which is the silent wrong paste the delay
	// exists to prevent.
	state.pasted = true;

	// The operator gets their feedback NOW rather than a second later when the
	// clipboard has been put back. Isolated: a UI callback must not be able to
	// change how the clipboard is handled.
	try {
		opts.onPasted?.();
	} catch (error) {
		deps.log?.("insert: the paste callback threw; continuing with the clipboard restore");
	}

	if (state.snapshot.status === "stashed") {
		// The ONLY path that waits: the target app has to be given time to read
		// the snippet before we take it back. Every other path never pasted, so
		// there is nothing to wait for.
		await waitBeforeRestore(deps, opts);
		state.restored = true;
		await finishRestore(deps, state.snapshot, written.changeCount, opts);
	}
	return { status: "ok" };
}

/**
 * Wait out the post-paste delay, and actually wait it.
 *
 * `opts.wait` exists so tests need no clock. If an injected timer rejects, the
 * real one runs instead rather than the delay being silently skipped — the
 * delay is what stands between the operator and a wrong paste, so it is not
 * something a failing dependency gets to opt out of.
 */
async function waitBeforeRestore(deps: ClipboardDeps, opts: InsertOptions): Promise<void> {
	const delay = opts.restoreDelayMs ?? RESTORE_AFTER_PASTE_MS;
	if (!opts.wait) return defaultWait(delay);
	try {
		await opts.wait(delay);
	} catch (error) {
		deps.log?.("insert: the injected wait failed; falling back to the real timer before restoring");
		await defaultWait(delay);
	}
}

/**
 * Is the stash still a faithful copy of what the operator had?
 *
 * Only if the clipboard has not moved since the snapshot was taken. The
 * snapshot and the gesture's first read are two separate operations, and a
 * copy landing between them makes the stash a picture of the past — restoring
 * it later would overwrite the newer copy with older content.
 */
function snapshotStillValid(
	snapshot: SnapshotResult,
	currentChangeCount: number | null,
	deps: ClipboardDeps,
): boolean {
	if (snapshot.status !== "stashed") return true; // nothing to invalidate
	if (currentChangeCount === null || currentChangeCount !== snapshot.changeCount) {
		deps.log?.("clipboard-stash: dropping the saved clipboard — it changed between saving and this gesture");
		return false;
	}
	return true;
}

/** Put the clipboard back and report the one failure the operator must hear
 * about. `restoreClipboard` checks the clipboard still holds the state our own
 * write produced, so somebody who copied something mid-gesture keeps it. */
async function finishRestore(
	deps: ClipboardDeps,
	snapshot: SnapshotResult,
	expectedChangeCount: number,
	opts: ClipboardRestoreOptions,
): Promise<void> {
	const restored = await restoreClipboard(deps, snapshot, expectedChangeCount);
	if (restored.status === "lost") opts.onClipboardLost?.();
}

function defaultWait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
