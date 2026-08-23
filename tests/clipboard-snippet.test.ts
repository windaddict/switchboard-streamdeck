import { describe, expect, it, vi } from "vitest";

import type { ErrorCode, RunResult } from "../src/applescript/runner.js";
import {
	CAPTURE_POLL_SCRIPT,
	type ClipboardDeps,
	COPY_KEYSTROKE_SCRIPT,
	captureSnippet,
	insertSnippet,
	parseBundleId,
	parseCapturePoll,
	parseChangeCount,
	parseSecureInputProbe,
	parseWriteResult,
	safeLogToken,
	PASTE_KEYSTROKE_SCRIPT,
	READ_CHANGE_COUNT_SCRIPT,
	READ_SNIPPET_TOKEN_SCRIPT,
	READ_FRONTMOST_BUNDLE_SCRIPT,
	SECURE_INPUT_PROBE_SCRIPT,
	WRITE_SNIPPET_SCRIPT,
} from "../src/mac/clipboard-snippet.js";
import { MAX_SNIPPET_BYTES } from "../src/mac/snippet.js";

const SECRET = "correct horse battery staple 🔒 password-ish text";
/** A realistic ownership token: the write script returns an NSUUID string. */
const TOKEN = "E2E702D4-817C-432F-9962-012C9FEF02DE";

function ok(stdout: string): RunResult {
	return { ok: true, code: "success", stdout, stderr: "" };
}

function fail(code: Exclude<ErrorCode, "success">, stderr = ""): RunResult {
	return { ok: false, code, stdout: "", stderr };
}

// ---------------------------------------------------------------------------
// Pure parsers
// ---------------------------------------------------------------------------

describe("parseSecureInputProbe", () => {
	it("maps exactly 'true' to secure and 'false' to not-secure", () => {
		expect(parseSecureInputProbe("true")).toBe("secure");
		expect(parseSecureInputProbe("true\n")).toBe("secure");
		expect(parseSecureInputProbe("false")).toBe("not-secure");
		expect(parseSecureInputProbe("false\n")).toBe("not-secure");
	});

	it("treats a thrown probe or garbage as unknown, never as secure", () => {
		expect(parseSecureInputProbe("probe-failed")).toBe("unknown");
		expect(parseSecureInputProbe("")).toBe("unknown");
		expect(parseSecureInputProbe("True")).toBe("unknown");
		expect(parseSecureInputProbe("1")).toBe("unknown");
	});
});

describe("parseChangeCount", () => {
	it("parses a plain integer, including 0 and negatives", () => {
		expect(parseChangeCount("254")).toBe(254);
		expect(parseChangeCount("254\n")).toBe(254);
		expect(parseChangeCount("0")).toBe(0);
		expect(parseChangeCount("-1")).toBe(-1);
	});

	it("rejects anything that isn't exactly an integer", () => {
		expect(parseChangeCount("read-failed")).toBeNull();
		expect(parseChangeCount("")).toBeNull();
		expect(parseChangeCount("12.5")).toBeNull();
		expect(parseChangeCount("12abc")).toBeNull();
	});
});

describe("parseBundleId", () => {
	it("trims and returns a non-empty bundle id", () => {
		expect(parseBundleId("com.apple.Terminal\n")).toBe("com.apple.Terminal");
	});

	it("treats empty output as null ('couldn't tell'), never as a real id", () => {
		expect(parseBundleId("")).toBeNull();
		expect(parseBundleId("   \n")).toBeNull();
	});
});

describe("parseCapturePoll", () => {
	it("parses unchanged/churn/readfail with their changeCount", () => {
		expect(parseCapturePoll("unchanged|254")).toEqual({ status: "unchanged", changeCount: 254 });
		expect(parseCapturePoll("churn|260\n")).toEqual({ status: "churn", changeCount: 260 });
		expect(parseCapturePoll("readfail|261")).toEqual({ status: "readfail", changeCount: 261 });
	});

	it("parses ok with a comma-joined type list and the raw text verbatim", () => {
		const output = "ok|public.utf8-plain-text,NSStringPboardType\nhello world";
		expect(parseCapturePoll(output)).toEqual({
			status: "ok",
			types: ["public.utf8-plain-text", "NSStringPboardType"],
			text: "hello world",
		});
	});

	it("survives quotes, backslashes, tabs, pipes, embedded newlines, accents and emoji in the payload", () => {
		const payload = 'quotes:" backslash:\\ tab:\t pipe:| newline:\nmore café 🎉';
		const output = `ok|public.utf8-plain-text\n${payload}`;
		const parsed = parseCapturePoll(output);
		expect(parsed?.status).toBe("ok");
		if (parsed?.status === "ok") expect(parsed.text).toBe(payload);
	});

	it("treats an empty type list ('ok|') as zero types, not malformed", () => {
		expect(parseCapturePoll("ok|\nsome text")).toEqual({ status: "ok", types: [], text: "some text" });
	});

	it("treats an empty payload after the newline as an empty (not missing) string", () => {
		// Real osascript always appends its OWN trailing newline on top of
		// whatever the script returns — verified live: a script returning
		// "ok|foo\n" produces the raw bytes "ok|foo\n\n". So the wire form of
		// an empty-payload "ok" is TWO newlines: ours (the separator) plus
		// osascript's.
		expect(parseCapturePoll("ok|public.utf8-plain-text\n\n")).toEqual({
			status: "ok",
			types: ["public.utf8-plain-text"],
			text: "",
		});
	});

	it("returns null for anything that isn't exactly one of the four framed shapes", () => {
		expect(parseCapturePoll("")).toBeNull();
		expect(parseCapturePoll("garbage")).toBeNull();
		expect(parseCapturePoll("unchanged|not-a-number")).toBeNull();
		expect(parseCapturePoll("churn|")).toBeNull();
		// "ok|..." with NO newline at all is malformed — the framing guarantees
		// a payload line, even an empty one.
		expect(parseCapturePoll("ok|public.utf8-plain-text")).toBeNull();
	});
});

describe("safeLogToken", () => {
	it("passes the script's own outcome codes and bundle ids through unchanged", () => {
		expect(safeLogToken("fail-write-concealed")).toBe("fail-write-concealed");
		expect(safeLogToken("com.googlecode.iterm2")).toBe("com.googlecode.iterm2");
		expect(safeLogToken("  permission-denied\n")).toBe("permission-denied");
	});

	/** The point of the whole function: this action promises the operator's
	 * selection never reaches a log line, and every value it logs is raw child
	 * stdout that could carry one. */
	it("replaces anything that isn't a short code-shaped token", () => {
		expect(safeLogToken(SECRET)).toBe("unrecognised");
		expect(safeLogToken("error: could not read 'my private note'")).toBe("unrecognised");
		expect(safeLogToken("a".repeat(49))).toBe("unrecognised");
		expect(safeLogToken("a".repeat(48))).toBe("a".repeat(48));
		expect(safeLogToken("")).toBe("unrecognised");
		expect(safeLogToken("line one\nline two")).toBe("unrecognised");
	});
});

describe("parseWriteResult: unknown reasons are dropped, not logged", () => {
	/** The reason reaches a log line, so an unexpected value must not pass
	 * through merely because it looks like a code. */
	it("passes only the script's own fail codes through", () => {
		expect(parseWriteResult("fail-write-token")).toEqual({ ok: false, reason: "fail-write-token" });
		expect(parseWriteResult("hunter2")).toEqual({ ok: false, reason: "unrecognised" });
		expect(parseWriteResult(SECRET)).toEqual({ ok: false, reason: "unrecognised" });
	});
});

describe("parseWriteResult", () => {
	it("recognizes exactly 'ok'", () => {
		expect(parseWriteResult("ok 41 E2E702D4-817C-432F-9962-012C9FEF02DE")).toEqual({
			ok: true,
			changeCount: 41,
			token: "E2E702D4-817C-432F-9962-012C9FEF02DE",
		});
		// A bare "ok" is NOT a success: it would pass the caller's success check
		// while silently skipping the pre-⌘V ownership verification.
		expect(parseWriteResult("ok")).toEqual({ ok: false, reason: "incomplete-write-receipt" });
		expect(parseWriteResult("ok 41\n")).toEqual({ ok: false, reason: "incomplete-write-receipt" });
		// A count we cannot parse is NOT silently treated as a valid one — and
		// the unparsable text does not reach the log verbatim either.
		expect(parseWriteResult("ok 4x")).toEqual({ ok: false, reason: "incomplete-write-receipt" });
		expect(parseWriteResult("ok 99999999999999999999 E2E702D4-817C-432F-9962-012C9FEF02DE")).toEqual({
			ok: false,
			reason: "bad-changecount",
		});
	});

	it("carries any fail-* reason through untouched", () => {
		expect(parseWriteResult("fail-stdin")).toEqual({ ok: false, reason: "fail-stdin" });
		expect(parseWriteResult("fail-write-concealed\n")).toEqual({ ok: false, reason: "fail-write-concealed" });
	});

	it("labels empty/garbled output as 'empty' rather than silently trusting it", () => {
		expect(parseWriteResult("")).toEqual({ ok: false, reason: "empty" });
		expect(parseWriteResult("   \n")).toEqual({ ok: false, reason: "empty" });
	});
});

// ---------------------------------------------------------------------------
// Orchestration: captureSnippet
// ---------------------------------------------------------------------------

/** A fully-controllable deps double. Every field is a vi.fn so a test can
 * assert on exactly which script was sent where, in addition to controlling
 * what it returns. Dispatch by exact script identity (not order), since
 * `runJxa` alone serves three distinct scripts across the two flows. */
function makeDeps(): {
	deps: ClipboardDeps;
	logs: string[];
	runAppleScript: ReturnType<typeof vi.fn>;
	runJxa: ReturnType<typeof vi.fn>;
	runJxaWithArgs: ReturnType<typeof vi.fn>;
	runJxaWithStdin: ReturnType<typeof vi.fn>;
} {
	const logs: string[] = [];
	const runAppleScript = vi.fn<ClipboardDeps["runAppleScript"]>();
	const runJxa = vi.fn<ClipboardDeps["runJxa"]>();
	const runJxaWithArgs = vi.fn<ClipboardDeps["runJxaWithArgs"]>();
	const runJxaWithStdin = vi.fn<ClipboardDeps["runJxaWithStdin"]>();
	const deps: ClipboardDeps = {
		runAppleScript,
		runJxa,
		runJxaWithArgs,
		runJxaWithStdin,
		log: (message) => logs.push(message),
	};
	return { deps, logs, runAppleScript, runJxa, runJxaWithArgs, runJxaWithStdin };
}

/** Wire up a "happy path" capture: secure-input probe says not-secure,
 * baseline changeCount reads 100, ⌘C succeeds, and the poll reports `ok`
 * with the given types/text. Returns the deps so a test can override any
 * single leg. */
function happyCaptureDeps(text: string, types: string[] = ["public.utf8-plain-text"]) {
	const d = makeDeps();
	d.runJxa.mockImplementation(async (script: string) => {
		if (script === SECURE_INPUT_PROBE_SCRIPT) return ok("false");
		if (script === READ_CHANGE_COUNT_SCRIPT) return ok("100");
		throw new Error(`unexpected runJxa script: ${script.slice(0, 40)}`);
	});
	d.runAppleScript.mockImplementation(async (script: string) => {
		if (script === COPY_KEYSTROKE_SCRIPT) return ok("");
		throw new Error(`unexpected runAppleScript script: ${script.slice(0, 40)}`);
	});
	d.runJxaWithArgs.mockImplementation(async (script: string, args: readonly string[]) => {
		if (script === CAPTURE_POLL_SCRIPT) {
			expect(args).toEqual(["100"]);
			return ok(`ok|${types.join(",")}\n${text}`);
		}
		throw new Error(`unexpected runJxaWithArgs script: ${script.slice(0, 40)}`);
	});
	return d;
}

describe("captureSnippet", () => {
	it("succeeds end to end: probe, baseline, ⌘C, poll ok, content returned", async () => {
		const d = happyCaptureDeps("hello 🎉");
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "ok", content: "hello 🎉" });
		expect(d.runAppleScript).toHaveBeenCalledTimes(1);
	});

	it("refuses secure-input WITHOUT ever sending ⌘C", async () => {
		const d = makeDeps();
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === SECURE_INPUT_PROBE_SCRIPT) return ok("true");
			throw new Error("should not read changeCount after a secure-input refusal");
		});
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "secure-input" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("proceeds (logs, does not refuse) when the secure-input probe call itself fails", async () => {
		const d = happyCaptureDeps("fine");
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === SECURE_INPUT_PROBE_SCRIPT) return fail("error");
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("100");
			throw new Error("unexpected");
		});
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "ok", content: "fine" });
	});

	it("proceeds (logs, does not refuse) when the secure-input probe returns something unexpected", async () => {
		const d = happyCaptureDeps("fine");
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === SECURE_INPUT_PROBE_SCRIPT) return ok("garbage");
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("100");
			throw new Error("unexpected");
		});
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "ok", content: "fine" });
	});

	it("refuses with an error, before sending ⌘C, when the baseline changeCount is unreadable", async () => {
		const d = makeDeps();
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === SECURE_INPUT_PROBE_SCRIPT) return ok("false");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("not-a-number");
			throw new Error("unexpected");
		});
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "error", detail: "baseline-unreadable" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("maps a permission-denied ⌘C keystroke to permission-denied", async () => {
		const d = happyCaptureDeps("unused");
		d.runAppleScript.mockImplementation(async () => fail("permission-denied", "not allowed assistive access (-1719)"));
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "permission-denied" });
	});

	it("maps a generic ⌘C keystroke failure to error", async () => {
		const d = happyCaptureDeps("unused");
		d.runAppleScript.mockImplementation(async () => fail("error"));
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "error", detail: "error" });
	});

	it("maps a permission-denied poll to permission-denied", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async () => fail("permission-denied"));
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "permission-denied" });
	});

	it("maps unparseable poll output to error", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async () => ok("garbage"));
		const outcome = await captureSnippet(d.deps);
		expect(outcome).toEqual({ status: "error", detail: "unparseable" });
	});

	it("maps poll 'unchanged' to no-selection", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async () => ok("unchanged|100"));
		expect(await captureSnippet(d.deps)).toEqual({ status: "no-selection" });
	});

	it("maps poll 'churn' to churn", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async () => ok("churn|103"));
		expect(await captureSnippet(d.deps)).toEqual({ status: "churn" });
	});

	it("maps poll 'readfail' to read-fail", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async () => ok("readfail|101"));
		expect(await captureSnippet(d.deps)).toEqual({ status: "read-fail" });
	});

	it("refuses 'concealed' when the copied item carries the nspasteboard concealed marker", async () => {
		const d = happyCaptureDeps("secret", ["public.utf8-plain-text", "org.nspasteboard.ConcealedType"]);
		expect(await captureSnippet(d.deps)).toEqual({ status: "concealed" });
	});

	it("refuses 'not-text' when there is no public.utf8-plain-text representation", async () => {
		const d = happyCaptureDeps("irrelevant", ["public.png"]);
		expect(await captureSnippet(d.deps)).toEqual({ status: "not-text" });
	});

	it("refuses 'too-big' when the captured text is over the size cap, without ever storing it", async () => {
		const d = happyCaptureDeps("a".repeat(MAX_SNIPPET_BYTES + 1));
		expect(await captureSnippet(d.deps)).toEqual({ status: "too-big" });
	});

	it("accepts content exactly at the size cap", async () => {
		const content = "a".repeat(MAX_SNIPPET_BYTES);
		const d = happyCaptureDeps(content);
		expect(await captureSnippet(d.deps)).toEqual({ status: "ok", content });
	});
});

// ---------------------------------------------------------------------------
// Orchestration: insertSnippet
// ---------------------------------------------------------------------------

/** Wire up a "happy path" insert: frontmost bundle id stable across both
 * reads, changeCount advances by exactly 1 after a successful write, and the
 * paste keystroke succeeds. */
function happyInsertDeps() {
	const d = makeDeps();
	let changeCountCalls = 0;
	d.runJxa.mockImplementation(async (script: string) => {
		if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
		if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
		if (script === READ_CHANGE_COUNT_SCRIPT) {
			changeCountCalls += 1;
			return ok(changeCountCalls === 1 ? "100" : "101");
		}
		throw new Error(`unexpected runJxa script: ${script.slice(0, 40)}`);
	});
	d.runJxaWithStdin.mockImplementation(async (script: string) => {
		// The real script reports the changeCount its own write produced, which
		// insertSnippet re-checks immediately before ⌘V.
		if (script === WRITE_SNIPPET_SCRIPT) return ok(`ok 101 ${TOKEN}`);
		throw new Error(`unexpected runJxaWithStdin script: ${script.slice(0, 40)}`);
	});
	d.runAppleScript.mockImplementation(async (script: string) => {
		if (script === PASTE_KEYSTROKE_SCRIPT) return ok("");
		throw new Error(`unexpected runAppleScript script: ${script.slice(0, 40)}`);
	});
	return d;
}

describe("captureSnippet: an empty copy must not erase the stored snippet", () => {
	/** A capture that yields "" used to be stored, replacing whatever the key
	 * held with nothing — a destructive outcome from a gesture that simply
	 * found no selection. */
	it("reports no-selection for exactly-empty text, and still captures whitespace", async () => {
		// NOTE the doubled newline: osascript appends a newline of its own to
		// whatever the script returns, so a script returning "ok|<types>\n" +
		// "" really does arrive as "ok|<types>\n\n" — which parses as an ok
		// with empty text. (The other fixtures here omit that trailing newline
		// because the parser strips exactly one either way.)
		const empty = makeDeps();
		empty.runJxa.mockImplementation(async (script: string) => {
			if (script === SECURE_INPUT_PROBE_SCRIPT) return ok("false");
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("100");
			throw new Error("unexpected");
		});
		empty.runAppleScript.mockImplementation(async () => ok(""));
		empty.runJxaWithArgs.mockImplementation(async () => ok("ok|public.utf8-plain-text\n\n"));
		expect(await captureSnippet(empty.deps)).toEqual({ status: "no-selection" });

		expect(await captureSnippet(happyCaptureDeps("   ").deps)).toEqual({ status: "ok", content: "   " });
	});
});

describe("insertSnippet", () => {
	it("succeeds end to end: write ok, changeCount advances, frontmost stable, ⌘V sent", async () => {
		const d = happyInsertDeps();
		const outcome = await insertSnippet("paste me", d.deps);
		expect(outcome).toEqual({ status: "ok" });
		expect(d.runAppleScript).toHaveBeenCalledTimes(1);
	});

	/** The window between our write and the ⌘V is real: a clipboard manager or
	 * another app can take the pasteboard in it, and then ⌘V pastes THEIR
	 * content wherever the operator's cursor is. Everything else only proves
	 * our write happened; this proves it is still what's there. */
	it("refuses to paste when the pasteboard changed again after our write", async () => {
		const d = happyInsertDeps();
		let reads = 0;
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) {
				reads += 1;
				// 100 baseline, 101 = ours, then 102: someone else wrote.
				return ok(reads === 1 ? "100" : reads === 2 ? "101" : "102");
			}
			throw new Error(`unexpected runJxa script: ${script.slice(0, 40)}`);
		});
		expect(await insertSnippet("paste me", d.deps)).toEqual({ status: "clobbered" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("refuses to paste when the final changeCount read fails outright", async () => {
		const d = happyInsertDeps();
		let reads = 0;
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) {
				reads += 1;
				if (reads >= 3) return fail("script-error");
				return ok(reads === 1 ? "100" : "101");
			}
			throw new Error(`unexpected runJxa script: ${script.slice(0, 40)}`);
		});
		expect(await insertSnippet("paste me", d.deps)).toEqual({ status: "clobbered" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	/** The gap F001 identified: reading changeCount after writeObjects is not
	 * atomic with it, so a writer landing in between yields a count that
	 * describes THEIR write and then never moves — passing a count-equality
	 * check while the pasteboard holds their content. Only reading our own
	 * per-write token back catches it. */
	it("refuses when the changeCount is stable but the item on the pasteboard is not ours", async () => {
		const d = happyInsertDeps();
		let reads = 0;
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok("none");
			if (script === READ_CHANGE_COUNT_SCRIPT) {
				reads += 1;
				return ok(reads === 1 ? "100" : "101");
			}
			throw new Error(`unexpected runJxa script: ${script.slice(0, 40)}`);
		});
		expect(await insertSnippet("paste me", d.deps)).toEqual({ status: "clobbered" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("refuses a write receipt that carries no ownership token", async () => {
		const d = happyInsertDeps();
		d.runJxaWithStdin.mockImplementation(async () => ok("ok 101"));
		expect(await insertSnippet("paste me", d.deps)).toEqual({
			status: "write-failed",
			detail: "incomplete-write-receipt",
		});
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("refuses too-big BEFORE touching any dependency at all", async () => {
		const d = makeDeps();
		const outcome = await insertSnippet("a".repeat(MAX_SNIPPET_BYTES + 1), d.deps);
		expect(outcome).toEqual({ status: "too-big" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
		expect(d.runJxa).not.toHaveBeenCalled();
		expect(d.runJxaWithStdin).not.toHaveBeenCalled();
	});

	it("accepts content exactly at the size cap", async () => {
		const d = happyInsertDeps();
		const outcome = await insertSnippet("a".repeat(MAX_SNIPPET_BYTES), d.deps);
		expect(outcome).toEqual({ status: "ok" });
	});

	it("maps a permission-denied write to permission-denied, without sending ⌘V", async () => {
		const d = happyInsertDeps();
		d.runJxaWithStdin.mockImplementation(async () => fail("permission-denied"));
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "permission-denied" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("maps a generic write failure to error, without sending ⌘V", async () => {
		const d = happyInsertDeps();
		d.runJxaWithStdin.mockImplementation(async () => fail("error"));
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "error", detail: "error" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("surfaces a fail-* write result as write-failed with its reason, without sending ⌘V", async () => {
		const d = happyInsertDeps();
		d.runJxaWithStdin.mockImplementation(async () => ok("fail-write-concealed"));
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "write-failed", detail: "fail-write-concealed" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("refuses not-confirmed when changeCount does not advance past the baseline, without sending ⌘V", async () => {
		const d = happyInsertDeps();
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("100"); // never advances
			throw new Error("unexpected");
		});
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "not-confirmed" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("refuses not-confirmed when the changeCount reads are unreadable", async () => {
		const d = happyInsertDeps();
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("not-a-number");
			throw new Error("unexpected");
		});
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "not-confirmed" });
	});

	it("refuses frontmost-changed when the frontmost app genuinely differs before the keystroke", async () => {
		const d = happyInsertDeps();
		let bundleCalls = 0;
		let changeCountCalls = 0;
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) {
				bundleCalls += 1;
				return ok(bundleCalls === 1 ? "com.googlecode.iterm2" : "com.apple.Terminal");
			}
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) {
				changeCountCalls += 1;
				return ok(changeCountCalls === 1 ? "100" : "101"); // advances, so this refusal is isolated to the bundle check
			}
			throw new Error("unexpected");
		});
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "frontmost-changed" });
		expect(d.runAppleScript).not.toHaveBeenCalled();
	});

	it("still pastes when the frontmost app is unreadable on either side (mitigation, not a guarantee)", async () => {
		const d = happyInsertDeps();
		let changeCountCalls = 0;
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok(""); // unreadable both times
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) {
				changeCountCalls += 1;
				return ok(changeCountCalls === 1 ? "100" : "101");
			}
			throw new Error("unexpected");
		});
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "ok" });
		expect(d.runAppleScript).toHaveBeenCalledTimes(1);
	});

	it("maps a permission-denied ⌘V keystroke to permission-denied", async () => {
		const d = happyInsertDeps();
		d.runAppleScript.mockImplementation(async () => fail("permission-denied"));
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "permission-denied" });
	});

	it("maps a generic ⌘V keystroke failure to error", async () => {
		const d = happyInsertDeps();
		d.runAppleScript.mockImplementation(async () => fail("error"));
		const outcome = await insertSnippet("x", d.deps);
		expect(outcome).toEqual({ status: "error", detail: "error" });
	});
});

// ---------------------------------------------------------------------------
// Injection guard: content is NEVER spliced into script source
// ---------------------------------------------------------------------------

describe("injection guard", () => {
	it("delivers a hostile insert payload via stdin only — the script source passed is the exact, unmodified constant", async () => {
		const d = happyInsertDeps();
		let seenScript = "";
		let seenInput = "";
		d.runJxaWithStdin.mockImplementation(async (script: string, input: string) => {
			seenScript = script;
			seenInput = input;
			return ok("ok");
		});
		const hostile = `" & (do shell script "echo PWNED") & "\nline2\t|pipe`;
		await insertSnippet(hostile, d.deps);
		// The script SOURCE sent is exactly the exported constant — the hostile
		// text never appears inside it.
		expect(seenScript).toBe(WRITE_SNIPPET_SCRIPT);
		expect(seenScript).not.toContain(hostile);
		// The hostile text arrives, verbatim, only as the stdin payload.
		expect(seenInput).toBe(hostile);
	});
});

// ---------------------------------------------------------------------------
// Log redaction: the secret must never appear in any log() call, on any path
// ---------------------------------------------------------------------------

describe("log redaction", () => {
	async function collectLogs(run: (log: (message: string) => void) => Promise<unknown>): Promise<string[]> {
		const logs: string[] = [];
		await run((message) => logs.push(message));
		return logs;
	}

	it("never logs the captured text on the success path", async () => {
		const d = happyCaptureDeps(SECRET);
		const logs = await collectLogs(async (log) => {
			await captureSnippet({ ...d.deps, log });
		});
		expect(logs.length).toBeGreaterThan(0);
		for (const line of logs) expect(line).not.toContain(SECRET);
	});

	it("never logs the selection text on the too-big capture refusal", async () => {
		const big = SECRET + "a".repeat(MAX_SNIPPET_BYTES);
		const d = happyCaptureDeps(big);
		const logs = await collectLogs(async (log) => {
			await captureSnippet({ ...d.deps, log });
		});
		for (const line of logs) expect(line).not.toContain(SECRET);
	});

	it("never logs the snippet on a successful insert", async () => {
		const d = happyInsertDeps();
		const logs = await collectLogs(async (log) => {
			await insertSnippet(SECRET, d.deps);
		});
		for (const line of logs) expect(line).not.toContain(SECRET);
	});

	it("never logs the snippet on a too-big insert refusal", async () => {
		const d = happyInsertDeps();
		const logs = await collectLogs(async (log) => {
			await insertSnippet(SECRET + "a".repeat(MAX_SNIPPET_BYTES), d.deps);
		});
		for (const line of logs) expect(line).not.toContain(SECRET);
	});

	it("never logs the snippet on a write-failed insert refusal", async () => {
		const d = happyInsertDeps();
		d.runJxaWithStdin.mockImplementation(async () => ok("fail-write-text"));
		const logs = await collectLogs(async (log) => {
			await insertSnippet(SECRET, d.deps);
		});
		for (const line of logs) expect(line).not.toContain(SECRET);
	});
});
