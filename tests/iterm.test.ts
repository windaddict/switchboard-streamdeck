import { describe, expect, it } from "vitest";
import { buildITermRaiseScript, ITERM_BUNDLE_ID, ITERM_FOCUSED_TTY_SCRIPT } from "../src/mac/iterm.js";

describe("buildITermRaiseScript", () => {
	it("builds a well-formed raise script for a normal tty", () => {
		const script = buildITermRaiseScript("/dev/ttys000");

		expect(script).toContain('tell application "iTerm"');
		expect(script).toContain("activate");
		expect(script).toContain("tty of");
		expect(script).toContain("/dev/ttys000");
		expect(script).toContain("select");
		expect(script).toContain('return "ok"');
		expect(script).toContain('return "notfound"');
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

		// Isolate the interpolated literal region (between `is "` and the final
		// `" then` on the comparison line) and assert no unescaped quote — a `"`
		// not preceded by a backslash — survives from the payload.
		const line = script.split("\n").find((l) => l.includes("(tty of s) is"));
		expect(line).toBeDefined();
		const interpolated = (line as string).replace(/^.*?is "/, "").replace(/" then$/, "");
		expect(/(^|[^\\])"/.test(interpolated)).toBe(false);
		expect(interpolated).toContain('\\"');
	});

	it("escapes a backslash to a double backslash", () => {
		const script = buildITermRaiseScript("/dev/ttys\\000");

		expect(script).toContain("/dev/ttys\\\\000");
		expect(script).not.toContain("/dev/ttys\\000 then");
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
