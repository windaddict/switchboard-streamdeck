import { describe, expect, it, vi } from "vitest";

import type { ErrorCode, RunResult } from "../src/applescript/runner.js";
import {
	CAPTURE_POLL_SCRIPT,
	type ClipboardDeps,
	COPY_KEYSTROKE_SCRIPT,
	captureSnippet,
	insertSnippet,
	RESTORE_AFTER_PASTE_MS,
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
import {
	RELEASE_SCRIPT,
	RESTORE_SCRIPT,
	SNAPSHOT_SCRIPT,
	STASH_PASTEBOARD_NAME,
} from "../src/mac/pasteboard-stash.js";

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
		const output = "ok|public.utf8-plain-text,NSStringPboardType|254\nhello world";
		expect(parseCapturePoll(output)).toEqual({
			status: "ok",
			types: ["public.utf8-plain-text", "NSStringPboardType"],
			text: "hello world",
			changeCount: 254,
		});
	});

	it("survives quotes, backslashes, tabs, pipes, embedded newlines, accents and emoji in the payload", () => {
		const payload = 'quotes:" backslash:\\ tab:\t pipe:| newline:\nmore café 🎉';
		const output = `ok|public.utf8-plain-text|254\n${payload}`;
		const parsed = parseCapturePoll(output);
		expect(parsed?.status).toBe("ok");
		if (parsed?.status === "ok") expect(parsed.text).toBe(payload);
	});

	it("treats an empty type list ('ok|') as zero types, not malformed", () => {
		expect(parseCapturePoll("ok||254\nsome text")).toEqual({
			status: "ok",
			types: [],
			text: "some text",
			changeCount: 254,
		});
	});

	it("treats an empty payload after the newline as an empty (not missing) string", () => {
		// Real osascript always appends its OWN trailing newline on top of
		// whatever the script returns — verified live: a script returning
		// "ok|foo\n" produces the raw bytes "ok|foo\n\n". So the wire form of
		// an empty-payload "ok" is TWO newlines: ours (the separator) plus
		// osascript's.
		expect(parseCapturePoll("ok|public.utf8-plain-text|254\n\n")).toEqual({
			status: "ok",
			types: ["public.utf8-plain-text"],
			text: "",
			changeCount: 254,
		});
	});

	it("returns null for anything that isn't exactly one of the four framed shapes", () => {
		expect(parseCapturePoll("")).toBeNull();
		expect(parseCapturePoll("garbage")).toBeNull();
		expect(parseCapturePoll("unchanged|not-a-number")).toBeNull();
		expect(parseCapturePoll("churn|")).toBeNull();
		// "ok|..." with NO newline at all is malformed — the framing guarantees
		// a payload line, even an empty one.
		expect(parseCapturePoll("ok|public.utf8-plain-text|254")).toBeNull();
		// The changeCount field is REQUIRED: the clipboard restore checks
		// against it, so an ok line without one is malformed, not a legacy
		// shape to be tolerated.
		expect(parseCapturePoll("ok|public.utf8-plain-text\nhello")).toBeNull();
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
	// The clipboard save/restore scripts answer by default in EVERY fixture, so
	// a test that cares about the capture or insert logic doesn't have to know
	// they exist. A test that cares about the restore overrides them.
	runJxaWithArgs.mockImplementation(async (script: string) => {
		if (script === SNAPSHOT_SCRIPT) return ok("ok 1 12 100");
		if (script === RESTORE_SCRIPT) return ok("ok 999");
		if (script === RELEASE_SCRIPT) return ok("ok");
		throw new Error(`unexpected runJxaWithArgs script: ${script.slice(0, 40)}`);
	});
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
			return ok(`ok|${types.join(",")}|101\n${text}`);
		}
		if (script === SNAPSHOT_SCRIPT) return ok("ok 1 12 100");
		if (script === RESTORE_SCRIPT) return ok("ok 102");
		if (script === RELEASE_SCRIPT) return ok("ok");
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

describe("captureSnippet: the operator's clipboard is put back", () => {
	/** The whole point of the feature: a long-press must not cost the operator
	 * whatever they were carrying on the clipboard. */
	it("saves before ⌘C and restores against the changeCount its own copy produced", async () => {
		const d = happyCaptureDeps("captured text");
		expect(await captureSnippet(d.deps)).toEqual({ status: "ok", content: "captured text" });
		const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
		expect(scripts).toEqual([SNAPSHOT_SCRIPT, CAPTURE_POLL_SCRIPT, RESTORE_SCRIPT, RELEASE_SCRIPT]);
		// 101 is the changeCount the poll reported — OUR ⌘C's result, not a
		// value read afresh at restore time, which would defeat the check.
		const restore = d.runJxaWithArgs.mock.calls.find((c: unknown[]) => c[0] === RESTORE_SCRIPT);
		expect(restore?.[1]).toEqual([STASH_PASTEBOARD_NAME, "101"]);
	});

	/** A gesture that refuses to store anything should still leave the
	 * clipboard as it found it — the refusals are exactly when the operator is
	 * least expecting to have lost something. */
	it("restores on every refusal, not just on success", async () => {
		const cases: Array<[string, string[]]> = [
			["concealed", ["public.utf8-plain-text", "org.nspasteboard.ConcealedType"]],
			["not-text", ["public.tiff"]],
		];
		for (const [expected, types] of cases) {
			const d = happyCaptureDeps("whatever", types);
			expect((await captureSnippet(d.deps)).status).toBe(expected);
			const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
			expect(scripts).toContain(RESTORE_SCRIPT);
		}

		const big = happyCaptureDeps("x".repeat(MAX_SNIPPET_BYTES + 1));
		expect((await captureSnippet(big.deps)).status).toBe("too-big");
		expect(big.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0])).toContain(RESTORE_SCRIPT);
	});

	/** Nothing was copied, so the clipboard never moved and there is nothing to
	 * put back. Writing the stash over an unchanged clipboard would be a pure
	 * cost: a redundant write that a clipboard manager records as a new entry. */
	/** `churn` means a SECOND write landed after the one our ⌘C produced —
	 * quite possibly the operator copying something themselves. We do not own
	 * that state, so restoring over it would overwrite their copy. */
	it("does not restore after churn, because the clipboard is no longer ours", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async (script: string) => {
			if (script === CAPTURE_POLL_SCRIPT) return ok("churn|108");
			if (script === SNAPSHOT_SCRIPT) return ok("ok 1 12 100");
			if (script === RELEASE_SCRIPT) return ok("ok");
			throw new Error("unexpected");
		});
		expect((await captureSnippet(d.deps)).status).toBe("churn");
		const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
		expect(scripts).not.toContain(RESTORE_SCRIPT);
		expect(scripts).toContain(RELEASE_SCRIPT);
	});

	/** Same reasoning: if we could not read the clipboard at all, we certainly
	 * cannot claim to own what is on it. */
	it("does not restore after a failed read", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async (script: string) => {
			if (script === CAPTURE_POLL_SCRIPT) return ok("readfail|108");
			if (script === SNAPSHOT_SCRIPT) return ok("ok 1 12 100");
			if (script === RELEASE_SCRIPT) return ok("ok");
			throw new Error("unexpected");
		});
		expect((await captureSnippet(d.deps)).status).toBe("read-fail");
		expect(d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0])).not.toContain(RESTORE_SCRIPT);
	});

	it("does not restore when the clipboard demonstrably never moved", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxaWithArgs.mockImplementation(async (script: string) => {
			if (script === CAPTURE_POLL_SCRIPT) return ok("unchanged|100");
			if (script === SNAPSHOT_SCRIPT) return ok("ok 1 12 100");
			if (script === RELEASE_SCRIPT) return ok("ok");
			throw new Error("unexpected");
		});
		expect((await captureSnippet(d.deps)).status).toBe("no-selection");
		const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
		expect(scripts).not.toContain(RESTORE_SCRIPT);
		// ...but the stash is still released, or it outlives the gesture.
		expect(scripts).toContain(RELEASE_SCRIPT);
	});

	/** A clipboard we could not save is not a reason to refuse the gesture the
	 * operator actually asked for. */
	it("still captures when the snapshot could not be taken", async () => {
		for (const snapshotOutput of ["skip-concealed", "skip-too-big 99999999", "fail-unreadable", "empty 100"]) {
			const d = happyCaptureDeps("captured text");
			d.runJxaWithArgs.mockImplementation(async (script: string) => {
				if (script === CAPTURE_POLL_SCRIPT) return ok("ok|public.utf8-plain-text|101\ncaptured text");
				if (script === SNAPSHOT_SCRIPT) return ok(snapshotOutput);
				throw new Error(`unexpected ${script.slice(0, 20)}`);
			});
			expect(await captureSnippet(d.deps)).toEqual({ status: "ok", content: "captured text" });
			// Nothing was stashed, so no restore may run: it would write a STALE
			// stash from an earlier gesture over the current clipboard.
			expect(d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0])).not.toContain(RESTORE_SCRIPT);
		}
	});

	it("touches neither script when restoration is switched off for the key", async () => {
		const d = happyCaptureDeps("captured text");
		expect(await captureSnippet(d.deps, { restoreClipboard: false })).toEqual({
			status: "ok",
			content: "captured text",
		});
		const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
		expect(scripts).toEqual([CAPTURE_POLL_SCRIPT]);
	});

	/** Refusing before we have touched anything must not leave a stash behind
	 * — and must not have taken one in the first place. */
	it("never snapshots when Secure Input refuses the gesture outright", async () => {
		const d = happyCaptureDeps("unused");
		d.runJxa.mockImplementation(async (script: string) =>
			script === SECURE_INPUT_PROBE_SCRIPT ? ok("true") : ok("100"),
		);
		expect(await captureSnippet(d.deps)).toEqual({ status: "secure-input" });
		expect(d.runJxaWithArgs).not.toHaveBeenCalled();
	});
});

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
		empty.runJxaWithArgs.mockImplementation(async (script: string) =>
			script === CAPTURE_POLL_SCRIPT ? ok("ok|public.utf8-plain-text|101\n\n") : ok("ok"),
		);
		expect(await captureSnippet(empty.deps, { restoreClipboard: false })).toEqual({ status: "no-selection" });

		expect(await captureSnippet(happyCaptureDeps("   ").deps)).toEqual({ status: "ok", content: "   " });
	});
});

describe("insertSnippet: the operator's clipboard is put back", () => {
	/** Every insert goes through the clipboard, so every insert would otherwise
	 * cost the operator whatever they were carrying. */
	it("saves before the write and restores against the changeCount its own write produced", async () => {
		const d = happyInsertDeps();
		expect(await insertSnippet("paste me", d.deps, { restoreDelayMs: 0 })).toEqual({ status: "ok" });
		const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
		expect(scripts).toEqual([SNAPSHOT_SCRIPT, RESTORE_SCRIPT, RELEASE_SCRIPT]);
		const restore = d.runJxaWithArgs.mock.calls.find((c: unknown[]) => c[0] === RESTORE_SCRIPT);
		// 101 is OUR write's changeCount, from the write receipt.
		expect(restore?.[1]).toEqual([STASH_PASTEBOARD_NAME, "101"]);
	});

	/** The restore must not run until the target app has had time to read the
	 * snippet — measured at 25ms on this Mac, hence the generous default. If
	 * the wait were skipped the app could read the RESTORED clipboard and paste
	 * something the operator never asked for. */
	it("waits before restoring, and posts ⌘V before it waits", async () => {
		const d = happyInsertDeps();
		const order: string[] = [];
		d.runAppleScript.mockImplementation(async (script: string) => {
			if (script === PASTE_KEYSTROKE_SCRIPT) order.push("paste");
			return ok("");
		});
		d.runJxaWithArgs.mockImplementation(async (script: string) => {
			if (script === RESTORE_SCRIPT) order.push("restore");
			if (script === SNAPSHOT_SCRIPT) return ok("ok 1 12 100");
			return ok(script === RESTORE_SCRIPT ? "ok 102" : "ok");
		});
		await insertSnippet("paste me", d.deps, {
			restoreDelayMs: 5000,
			wait: async (ms) => void order.push(`waited:${ms}`),
			onPasted: () => order.push("showed-ok"),
		});
		expect(order).toEqual(["paste", "showed-ok", "waited:5000", "restore"]);
	});

	/** The default is not a round number chosen by taste: it is ~48x the
	 * longest read latency measured on this machine, including under load. */
	it("defaults the wait to the measured constant", async () => {
		const d = happyInsertDeps();
		const waited: number[] = [];
		await insertSnippet("x", d.deps, { wait: async (ms) => void waited.push(ms) });
		expect(waited).toEqual([RESTORE_AFTER_PASTE_MS]);
	});

	/** The save and the gesture's first read are two separate operations. A copy
	 * landing between them makes the stash a picture of the PAST, and restoring
	 * it later would destroy the copy the operator just made — which is the
	 * exact loss this feature exists to prevent, caused by the feature itself. */
	it("drops the saved clipboard when something was copied between saving and the gesture", async () => {
		const d = happyInsertDeps();
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			// The snapshot reported changeCount 100; the baseline read now says
			// 105, so somebody copied in between.
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("105");
			throw new Error("unexpected");
		});
		d.runJxaWithStdin.mockImplementation(async () => ok(`ok 105 ${TOKEN}`));
		await insertSnippet("x", d.deps, { restoreDelayMs: 0 });
		const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
		expect(scripts).not.toContain(RESTORE_SCRIPT);
		expect(scripts).toContain(RELEASE_SCRIPT);
	});

	/** Several refusals happen AFTER the snippet is already on the clipboard.
	 * Walking away from those would cost the operator their clipboard for a
	 * paste that never even occurred — the worst possible trade. */
	it("restores when the snippet reached the clipboard but the paste was refused", async () => {
		// The frontmost app changed between our write and the keystroke.
		const d = happyInsertDeps();
		let bundleCalls = 0;
		let countCalls = 0;
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) {
				bundleCalls += 1;
				return ok(bundleCalls === 1 ? "com.googlecode.iterm2" : "com.apple.Terminal");
			}
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok(TOKEN);
			if (script === READ_CHANGE_COUNT_SCRIPT) {
				countCalls += 1;
				return ok(countCalls === 1 ? "100" : "101");
			}
			throw new Error("unexpected");
		});
		expect((await insertSnippet("x", d.deps, { restoreDelayMs: 0 })).status).toBe("frontmost-changed");
		const restore = d.runJxaWithArgs.mock.calls.find((c: unknown[]) => c[0] === RESTORE_SCRIPT);
		expect(restore?.[1]).toEqual([STASH_PASTEBOARD_NAME, "101"]);
	});

	it("restores when the ⌘V keystroke itself fails", async () => {
		const d = happyInsertDeps();
		d.runAppleScript.mockImplementation(async () => fail("permission-denied"));
		expect((await insertSnippet("x", d.deps, { restoreDelayMs: 0 })).status).toBe("permission-denied");
		expect(d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0])).toContain(RESTORE_SCRIPT);
	});

	/** No wait on the refusal paths: nothing was pasted, so there is no reader
	 * to give time to. */
	it("does not wait before restoring when nothing was pasted", async () => {
		const d = happyInsertDeps();
		d.runAppleScript.mockImplementation(async () => fail("permission-denied"));
		const waited: number[] = [];
		await insertSnippet("x", d.deps, { wait: async (ms) => void waited.push(ms) });
		expect(waited).toEqual([]);
	});

	it("releases the stash WITHOUT restoring when the clipboard turned out not to be ours", async () => {
		// Refused at the ownership check. Restoring here would be actively
		// harmful: the clipboard holds somebody else's write — very possibly a
		// copy the operator just made — and putting the old contents back over
		// it would destroy exactly what this feature protects.
		const d = happyInsertDeps();
		d.runJxa.mockImplementation(async (script: string) => {
			if (script === READ_FRONTMOST_BUNDLE_SCRIPT) return ok("com.googlecode.iterm2");
			if (script === READ_SNIPPET_TOKEN_SCRIPT) return ok("none");
			if (script === READ_CHANGE_COUNT_SCRIPT) return ok("100");
			throw new Error("unexpected");
		});
		expect((await insertSnippet("x", d.deps, { restoreDelayMs: 0 })).status).toBe("not-confirmed");
		const scripts = d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0]);
		expect(scripts).not.toContain(RESTORE_SCRIPT);
		expect(scripts).toContain(RELEASE_SCRIPT);
	});

	it("touches neither script when restoration is switched off for the key", async () => {
		const d = happyInsertDeps();
		expect(await insertSnippet("x", d.deps, { restoreClipboard: false, restoreDelayMs: 0 })).toEqual({
			status: "ok",
		});
		expect(d.runJxaWithArgs).not.toHaveBeenCalled();
	});

	/** A clipboard we could not save must not stop the paste the operator
	 * actually asked for. */
	it("still pastes when the snapshot could not be taken", async () => {
		const d = happyInsertDeps();
		d.runJxaWithArgs.mockImplementation(async (script: string) =>
			script === SNAPSHOT_SCRIPT ? ok("skip-concealed") : ok("ok"),
		);
		expect(await insertSnippet("x", d.deps, { restoreDelayMs: 0 })).toEqual({ status: "ok" });
		expect(d.runAppleScript).toHaveBeenCalledTimes(1);
		expect(d.runJxaWithArgs.mock.calls.map((c: unknown[]) => c[0])).not.toContain(RESTORE_SCRIPT);
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
