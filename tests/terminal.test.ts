import { describe, expect, it } from "vitest";
import {
	buildTerminalRaiseScript,
	TERMINAL_BUNDLE_ID,
	TERMINAL_FOCUSED_TTY_SCRIPT,
} from "../src/mac/terminal.js";

describe("Terminal.app scripting", () => {
	it("bundle id", () => {
		expect(TERMINAL_BUNDLE_ID).toBe("com.apple.Terminal");
	});
	it("focused-tty script reads the selected tab of the front window, degrading to \"\"", () => {
		expect(TERMINAL_FOCUSED_TTY_SCRIPT).toContain("tty of selected tab of front window");
		expect(TERMINAL_FOCUSED_TTY_SCRIPT).toContain('return ""');
	});
	it("raise script selects the tab by tty, raises the window, and activates", () => {
		const s = buildTerminalRaiseScript("/dev/ttys004");
		expect(s).toContain('(tty of t) is "/dev/ttys004"');
		expect(s).toContain("set selected tab of w to t");
		expect(s).toContain("set frontmost of w to true");
		expect(s).toContain('return "notfound"');
	});
	it("escapes the tty and refuses an empty one", () => {
		expect(buildTerminalRaiseScript('x"y')).toContain('x\\"y');
		expect(buildTerminalRaiseScript("  ")).toBe("");
	});
});
