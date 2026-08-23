import { describe, expect, it, vi } from "vitest";

import type { ErrorCode, RunResult } from "../src/applescript/runner.js";
import {
	type AxDeps,
	type AxReadResult,
	type AxWriteResult,
	captureViaAx,
	decideCaptureRoute,
	decideInsertRoute,
	insertViaAx,
	parseAxRead,
	parseAxWrite,
	READ_SELECTION_SCRIPT,
	WRITE_SELECTION_SCRIPT,
} from "../src/mac/ax-text.js";

function ok(stdout: string): RunResult {
	return { ok: true, code: "success", stdout, stderr: "" };
}

function fail(code: Exclude<ErrorCode, "success">, stderr = ""): RunResult {
	return { ok: false, code, stdout: "", stderr };
}

const SELECTION = "correct horse battery staple 🔒 with \"quotes\", a\\backslash, a\ttab, a|pipe and\nan embedded newline";

// ---------------------------------------------------------------------------
// Script source sanity
// ---------------------------------------------------------------------------

describe("script sources", () => {
	it("READ_SELECTION_SCRIPT never mentions do shell script or base64", () => {
		expect(READ_SELECTION_SCRIPT).not.toMatch(/do shell script/i);
		expect(READ_SELECTION_SCRIPT).not.toMatch(/base64/i);
	});

	it("WRITE_SELECTION_SCRIPT takes its text only from argv, never interpolated", () => {
		expect(WRITE_SELECTION_SCRIPT).toContain("on run argv");
		expect(WRITE_SELECTION_SCRIPT).toContain("item 1 of argv");
	});

	it("both scripts ask whether AXSelectedText exists before reading/writing it", () => {
		expect(READ_SELECTION_SCRIPT).toContain('name of attributes of theElement');
		expect(READ_SELECTION_SCRIPT).toContain('attrNames does not contain "AXSelectedText"');
		expect(WRITE_SELECTION_SCRIPT).toContain('name of attributes of theElement');
		expect(WRITE_SELECTION_SCRIPT).toContain('attrNames does not contain "AXSelectedText"');
	});

	it("both scripts only ever return an error NUMBER, never errMsg, in their output", () => {
		// The `errMsg` local is bound (AppleScript requires naming it to get
		// `errNum`), but never appears on the right of `return`.
		expect(READ_SELECTION_SCRIPT).not.toMatch(/return[^\n]*errMsg/);
		expect(WRITE_SELECTION_SCRIPT).not.toMatch(/return[^\n]*errMsg/);
	});
});

// ---------------------------------------------------------------------------
// parseAxRead
// ---------------------------------------------------------------------------

describe("parseAxRead", () => {
	it("parses a clean ok + payload", () => {
		expect(parseAxRead("ok\nhello world\n")).toEqual({ status: "ok", text: "hello world" });
	});

	it("strips only the single trailing newline osascript appends — never trims the payload", () => {
		expect(parseAxRead("ok\n  leading and trailing spaces  \n")).toEqual({
			status: "ok",
			text: "  leading and trailing spaces  ",
		});
	});

	it("preserves embedded newlines, quotes, backslashes, tabs, pipes, accents and emoji verbatim", () => {
		expect(parseAxRead(`ok\n${SELECTION}\n`)).toEqual({ status: "ok", text: SELECTION });
	});

	it("preserves a payload that itself starts with a status-like word", () => {
		expect(parseAxRead("ok\nunsupported? not really, this is the actual text\n")).toEqual({
			status: "ok",
			text: "unsupported? not really, this is the actual text",
		});
	});

	it("parses unsupported and nosel with no payload", () => {
		expect(parseAxRead("unsupported\n")).toEqual({ status: "unsupported" });
		expect(parseAxRead("unsupported")).toEqual({ status: "unsupported" });
		expect(parseAxRead("nosel\n")).toEqual({ status: "nosel" });
		expect(parseAxRead("nosel")).toEqual({ status: "nosel" });
	});

	it("parses err|<n> and carries only the number", () => {
		expect(parseAxRead("err|-1728\n")).toEqual({ status: "error", code: -1728 });
		expect(parseAxRead("err|1700\n")).toEqual({ status: "error", code: 1700 });
	});

	it("treats 'ok' with no payload line at all as malformed, never as a successful empty read", () => {
		expect(parseAxRead("ok")).toEqual({ status: "malformed" });
		expect(parseAxRead("ok\n")).toEqual({ status: "malformed" });
	});

	it("treats garbage output as malformed, never as ok", () => {
		expect(parseAxRead("")).toEqual({ status: "malformed" });
		expect(parseAxRead("garbage\n")).toEqual({ status: "malformed" });
		expect(parseAxRead("err|notanumber\n")).toEqual({ status: "malformed" });
	});
});

// ---------------------------------------------------------------------------
// parseAxWrite
// ---------------------------------------------------------------------------

describe("parseAxWrite", () => {
	it("parses ok, unsupported, and err|<n>", () => {
		expect(parseAxWrite("ok\n")).toEqual({ status: "ok" });
		expect(parseAxWrite("unsupported\n")).toEqual({ status: "unsupported" });
		expect(parseAxWrite("err|-1719\n")).toEqual({ status: "error", code: -1719 });
	});

	it("treats garbage as malformed, never as ok", () => {
		expect(parseAxWrite("")).toEqual({ status: "malformed" });
		expect(parseAxWrite("garbage\n")).toEqual({ status: "malformed" });
		expect(parseAxWrite("err|nope\n")).toEqual({ status: "malformed" });
	});
});

// ---------------------------------------------------------------------------
// THE ROUTING RULE — the load-bearing behavior of this whole feature
// ---------------------------------------------------------------------------

describe("decideCaptureRoute", () => {
	it("uses accessibility on ok — clipboard never touched", () => {
		expect(decideCaptureRoute({ status: "ok", text: "hi" })).toBe("use-ax");
	});

	it("falls back to the clipboard when unsupported", () => {
		expect(decideCaptureRoute({ status: "unsupported" })).toBe("fall-back");
	});

	/** MEASURED on the operator's machine: iTerm2 reports `nosel` even with text
	 * selected — the attribute exists and stays empty — while ⌘C copies that
	 * selection perfectly. The earlier rule (suppress the fallback on `nosel` to
	 * avoid a needless ⌘C) therefore blocked the only mechanism that worked. A
	 * ⌘C with nothing selected is harmless; refusing to try is not. */
	it("DOES fall back on nosel, because an empty AX read does not mean nothing is selected", () => {
		expect(decideCaptureRoute({ status: "nosel" })).toBe("fall-back");
	});


	it("falls back on error (we could not tell)", () => {
		expect(decideCaptureRoute({ status: "error", code: -1728 })).toBe("fall-back");
	});

	it("falls back on malformed output, same as error", () => {
		expect(decideCaptureRoute({ status: "malformed" })).toBe("fall-back");
	});
});

describe("decideInsertRoute", () => {
	/** The accessibility write cannot be verified — it reports success when the
	 * call does not error, not when text actually lands. MEASURED: iTerm2
	 * accepted it, reported ok, and inserted nothing, three times in a row. So
	 * insert always goes through the clipboard, whose write we CAN confirm. */
	it("always falls back — the AX write reports success it cannot substantiate", () => {
		expect(decideInsertRoute()).toBe("fall-back");
	});
});

// ---------------------------------------------------------------------------
// Orchestrators over injected deps (no real process spawned)
// ---------------------------------------------------------------------------

function deps(overrides: Partial<AxDeps> = {}): AxDeps {
	return {
		runAppleScript: vi.fn(async () => ok("unsupported\n")),
		runAppleScriptWithArgs: vi.fn(async () => ok("ok\n")),
		log: vi.fn(),
		...overrides,
	};
}

describe("captureViaAx", () => {
	it("runs READ_SELECTION_SCRIPT with no args and returns the parsed result", async () => {
		const runAppleScript = vi.fn(async () => ok(`ok\n${SELECTION}\n`));
		const d = deps({ runAppleScript });
		const result: AxReadResult = await captureViaAx(d);
		expect(runAppleScript).toHaveBeenCalledWith(READ_SELECTION_SCRIPT);
		expect(result).toEqual({ status: "ok", text: SELECTION });
	});

	it("never logs the selection text, even on a successful read", async () => {
		const log = vi.fn();
        const d = deps({ runAppleScript: vi.fn(async () => ok(`ok\n${SELECTION}\n`)), log });
		await captureViaAx(d);
		for (const call of log.mock.calls) {
			expect(String(call[0])).not.toContain(SELECTION);
		}
	});

	it("maps a process-level runner failure to malformed and logs only the classification", async () => {
		const log = vi.fn();
		const d = deps({ runAppleScript: vi.fn(async () => fail("error", "some AppleScript error message with secrets")), log });
		const result = await captureViaAx(d);
		expect(result).toEqual({ status: "malformed" });
		const logged = log.mock.calls.map((c) => String(c[0])).join("\n");
		expect(logged).not.toContain("secrets");
		expect(logged).toContain("error");
	});

	it("passes through unsupported, nosel, and error without falling back itself (routing is the caller's job)", async () => {
		expect(await captureViaAx(deps({ runAppleScript: vi.fn(async () => ok("unsupported\n")) }))).toEqual({
			status: "unsupported",
		});
		expect(await captureViaAx(deps({ runAppleScript: vi.fn(async () => ok("nosel\n")) }))).toEqual({
			status: "nosel",
		});
		expect(await captureViaAx(deps({ runAppleScript: vi.fn(async () => ok("err|-1728\n")) }))).toEqual({
			status: "error",
			code: -1728,
		});
	});
});

describe("insertViaAx", () => {
	it("runs WRITE_SELECTION_SCRIPT with the content as the sole argv element", async () => {
		const runAppleScriptWithArgs = vi.fn(async () => ok("ok\n"));
		const d = deps({ runAppleScriptWithArgs });
		const result: AxWriteResult = await insertViaAx(SELECTION, d);
		expect(runAppleScriptWithArgs).toHaveBeenCalledWith(WRITE_SELECTION_SCRIPT, [SELECTION]);
		expect(result).toEqual({ status: "ok" });
	});

	it("never interpolates content into the script string passed to the runner", async () => {
		const runAppleScriptWithArgs = vi.fn(async () => ok("ok\n"));
		const d = deps({ runAppleScriptWithArgs });
		await insertViaAx(SELECTION, d);
		const [scriptArg] = runAppleScriptWithArgs.mock.calls[0]!;
		expect(scriptArg).not.toContain(SELECTION);
	});

	it("maps a process-level runner failure to malformed and logs only the classification", async () => {
		const log = vi.fn();
		const d = deps({
			runAppleScriptWithArgs: vi.fn(async () => fail("permission-denied", "leaked message")),
			log,
		});
		const result = await insertViaAx(SELECTION, d);
		expect(result).toEqual({ status: "malformed" });
		const logged = log.mock.calls.map((c) => String(c[0])).join("\n");
		expect(logged).not.toContain("leaked message");
	});

	it("passes through unsupported and error", async () => {
		expect(
			await insertViaAx(SELECTION, deps({ runAppleScriptWithArgs: vi.fn(async () => ok("unsupported\n")) })),
		).toEqual({ status: "unsupported" });
		expect(
			await insertViaAx(SELECTION, deps({ runAppleScriptWithArgs: vi.fn(async () => ok("err|-1719\n")) })),
		).toEqual({ status: "error", code: -1719 });
	});
});
