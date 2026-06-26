import { describe, it, expect } from "vitest";
import { buildJumpScript, escapeForAppleScript } from "../src/safari/applescript.js";
import type { ResolvedTarget } from "../src/safari/targets.js";

function target(over: Partial<ResolvedTarget> = {}): ResolvedTarget {
	return {
		url: "https://mail.google.com/mail/u/0/",
		urlPattern: "mail.google.com/mail/u/0",
		titlePattern: undefined,
		private: false,
		...over,
	};
}

describe("escapeForAppleScript", () => {
	it("doubles a backslash", () => {
		expect(escapeForAppleScript("a\\b")).toBe("a\\\\b");
	});
	it("escapes a double-quote", () => {
		expect(escapeForAppleScript('say "hi"')).toBe('say \\"hi\\"');
	});
	it("escapes a backslash before quotes are escaped (order)", () => {
		// A backslash then a quote: backslash -> \\, quote -> \"
		expect(escapeForAppleScript('\\"')).toBe('\\\\\\"');
	});
	it("INJECTION SAFETY: quotes in a breakout payload are escaped", () => {
		const payload = '"); do shell script "evil';
		const escaped = escapeForAppleScript(payload);
		// Every double-quote must be preceded by a backslash — no raw unescaped " survives.
		expect(escaped).not.toMatch(/(^|[^\\])"/);
		expect(escaped).toBe('\\"); do shell script \\"evil');
	});
});

describe("buildJumpScript — normal (non-private)", () => {
	const script = buildJumpScript(target());

	it('targets Safari', () => {
		expect(script).toContain('tell application "Safari"');
	});
	it("checks the urlPattern inside a contains clause", () => {
		expect(script).toContain('theURL contains "mail.google.com/mail/u/0"');
	});
	it("uses open location with the url as a fallback", () => {
		expect(script).toContain('open location "https://mail.google.com/mail/u/0/"');
	});
	it("sets the current tab", () => {
		expect(script).toContain("set current tab");
	});
	it("does NOT contain the private-window keystroke", () => {
		expect(script).not.toContain('keystroke "n"');
	});
});

describe("buildJumpScript — private", () => {
	const script = buildJumpScript(target({ private: true }));

	it("uses the ⌘⇧N private-window keystroke", () => {
		expect(script).toContain('keystroke "n" using {command down, shift down}');
	});
	it("sets the URL of the front document", () => {
		expect(script).toContain("set URL of front document");
	});
	it("does NOT contain the tab-matching repeat loop", () => {
		expect(script).not.toContain("repeat with");
	});
	it("does NOT contain the open location fallback", () => {
		expect(script).not.toContain("open location");
	});
});

describe("buildJumpScript — title fallback", () => {
	it("adds a name-of-tab clause per ||-separated alternate when titlePattern is set", () => {
		const script = buildJumpScript(
			target({ titlePattern: "Inbox|| - Gmail" }),
		);
		expect(script).toContain("set theName to name of tb");
		expect(script).toContain('(theName contains "Inbox")');
		expect(script).toContain('(theName contains "- Gmail")');
		// joined with " or "
		expect(script).toContain('(theName contains "Inbox") or (theName contains "- Gmail")');
	});
	it("emits no theName-contains clause when titlePattern is absent", () => {
		const script = buildJumpScript(target({ titlePattern: undefined }));
		expect(script).not.toContain("theName contains");
	});
});

describe("buildJumpScript — escaping in output", () => {
	it("escapes a double-quote present in the url and pattern", () => {
		const script = buildJumpScript(
			target({
				url: 'https://example.com/"weird"',
				urlPattern: 'example.com/"weird"',
			}),
		);
		// The escaped form must be present...
		expect(script).toContain('example.com/\\"weird\\"');
		// ...and no raw breakout quote (a bare " not preceded by a backslash, other
		// than the legitimate string-literal delimiters the template uses).
		expect(script).not.toContain('contains "example.com/"weird""');
	});
});
