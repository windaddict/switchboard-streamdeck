import { describe, expect, it } from "vitest";
import { buildITermRaiseScript, ITERM_BUNDLE_ID, ITERM_FOCUSED_TTY_SCRIPT, parseITermFocusResult } from "../src/mac/iterm.js";

describe("buildITermRaiseScript", () => {
	it("builds a well-formed raise script for a normal tty", () => {
		const script = buildITermRaiseScript("/dev/ttys000");

		expect(script).toContain('tell application "iTerm"');
		expect(script).toContain("activate");
		expect(script).toContain("tty of");
		expect(script).toContain("/dev/ttys000");
		expect(script).toContain("select");
		expect(script).toContain("targetWindowId");
		expect(script).toContain("id of current window");
		expect(script).toContain("miniaturized of targetWindow");
		expect(script).toContain("and frontmost");
		expect(script).toContain("on error errMsg number errNum");
		expect(script).toContain("repeat with attempt from 1 to 30");
		expect(script.indexOf("activate")).toBeLessThan(script.indexOf("tell t to select"));
		expect(script).toContain('return "timeout|"');
		expect(script).toContain('return "ok|"');
		expect(script).toContain('return "notfound||"');
	});

	it("returns an empty string for an empty tty", () => {
		expect(buildITermRaiseScript("")).toBe("");
	});

	it("returns an empty string for a whitespace-only tty", () => {
		expect(buildITermRaiseScript("   ")).toBe("");
		expect(buildITermRaiseScript("\t\n ")).toBe("");
	});

	it("escapes a double-quote so the payload cannot break out of the string literal", () => {
		const payload = '/dev/ttys000" then do shell script "x';
		const script = buildITermRaiseScript(payload);

		// The escaped form must be present.
		expect(script.includes('\\" then do shell script')).toBe(true);
		// No *unescaped* breakout quote may precede the payload tail: every
		// occurrence of `" then do shell script` must be preceded by a backslash.
		expect(/(^|[^\\])" then do shell script/.test(script)).toBe(false);

		// Isolate the interpolated targetTty literal and assert no unescaped quote — a `"`
		// not preceded by a backslash — survives from the payload.
		const line = script.split("\n").find((l) => l.startsWith("set targetTty to "));
		expect(line).toBeDefined();
		const interpolated = (line as string).replace(/^set targetTty to "/, "").replace(/"$/, "");
		expect(/(^|[^\\])"/.test(interpolated)).toBe(false);
		expect(interpolated).toContain('\\"');
	});

	it("escapes a backslash to a double backslash", () => {
		const script = buildITermRaiseScript("/dev/ttys\\000");

		expect(script).toContain("/dev/ttys\\\\000");
		expect(script).not.toContain("/dev/ttys\\000 then");
	});
});

describe("parseITermFocusResult", () => {
	it("parses verified success with observed identity", () => {
		expect(parseITermFocusResult("ok|42|/dev/ttys007\n")).toEqual({ status: "ok", windowId: "42", tty: "/dev/ttys007" });
	});
	it("distinguishes missing targets and timeouts", () => {
		expect(parseITermFocusResult("notfound||").status).toBe("notfound");
		expect(parseITermFocusResult("timeout|17|/dev/ttys001")).toEqual({ status: "timeout", windowId: "17", tty: "/dev/ttys001" });
	});
	it("preserves an AppleScript error number", () => {
		expect(parseITermFocusResult("error|-1728|")).toEqual({ status: "error", windowId: "-1728", tty: "" });
	});
	it("classifies malformed output", () => {
		expect(parseITermFocusResult("")).toEqual({ status: "error", windowId: "", tty: "" });
	});
});

describe("focused-tty probe", () => {
	it("reads the tty of iTerm's focused session (current window > tab > session)", () => {
		expect(ITERM_FOCUSED_TTY_SCRIPT).toContain("tty of current session of current tab of current window");
	});
	it("degrades to \"\" instead of erroring when there is no window", () => {
		expect(ITERM_FOCUSED_TTY_SCRIPT).toContain('return ""');
	});
	it("bundle id matches iTerm2", () => {
		expect(ITERM_BUNDLE_ID).toBe("com.googlecode.iterm2");
	});
});
