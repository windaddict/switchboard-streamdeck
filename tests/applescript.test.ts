import { describe, it, expect } from "vitest";
import { buildJumpScript, escapeForAppleScript, FRONT_TAB_URL_SCRIPT, wildcardSegments } from "../src/safari/applescript.js";
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
	it("matches the urlPattern via the ordered-segment helper", () => {
		expect(script).toContain('set segs to {"mail.google.com/mail/u/0"}');
		expect(script).toContain("my urlMatches(theURL)");
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
	it("coerces a missing-value tab URL/name to \"\" (unloaded tabs return missing value without erroring)", () => {
		expect(script).toContain('if theURL is missing value then set theURL to ""');
		expect(script).toContain('if theName is missing value then set theName to ""');
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
	it("guards against clobbering the current tab (counts windows, sets URL only after a NEW one exists)", () => {
		// A URL-change proxy fails when the new window's start page matches the
		// old front tab — the window COUNT increasing is the reliable signal.
		expect(script).toContain("set prevCount to (count of windows)");
		expect(script).toContain("repeat until ((count of windows) > prevCount)");
		expect(script).toContain('if (count of windows) > prevCount then');
	});
	it("RAISES on timeout — osascript must exit non-zero (a returned string reads as success)", () => {
		expect(script).toContain('error "private window did not open"');
		expect(script).not.toContain('return "error');
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
		// ...and the raw, unescaped pattern must NOT appear (no quote breakout).
		expect(script).not.toContain('example.com/"weird"');
	});
});

describe("wildcardSegments", () => {
	it("no wildcard yields a single segment", () => {
		expect(wildcardSegments("mail.google.com/u/2")).toEqual(["mail.google.com/u/2"]);
	});
	it("splits on * and drops empty pieces", () => {
		expect(wildcardSegments("a*b*c")).toEqual(["a", "b", "c"]);
	});
	it("drops empty edges from leading/trailing *", () => {
		expect(wildcardSegments("*github.com/*/pull*")).toEqual(["github.com/", "/pull"]);
	});
	it("bare * or empty string matches anything (no segments)", () => {
		expect(wildcardSegments("*")).toEqual([]);
		expect(wildcardSegments("")).toEqual([]);
	});
});

describe("buildJumpScript — wildcards", () => {
	it("renders a *-pattern as ordered segments matched in order", () => {
		const script = buildJumpScript(target({ urlPattern: "github.com/*/pull/*" }));
		expect(script).toContain('set segs to {"github.com/", "/pull/"}');
		expect(script).toContain("my urlMatches(theURL)");
	});
	it("keeps a no-* pattern as a single-segment (substring) match", () => {
		const script = buildJumpScript(target({ urlPattern: "mail.google.com/u/2" }));
		expect(script).toContain('set segs to {"mail.google.com/u/2"}');
	});
});

describe("FRONT_TAB_URL_SCRIPT", () => {
	it("reads the current tab of the front window", () => {
		expect(FRONT_TAB_URL_SCRIPT).toContain("current tab of front window");
	});
	it("guards missing value (unloaded tabs yield it without erroring)", () => {
		expect(FRONT_TAB_URL_SCRIPT).toContain('if u is missing value then return ""');
	});
	it("guards the no-window case", () => {
		expect(FRONT_TAB_URL_SCRIPT).toContain('if (count of windows) is 0 then return ""');
	});
});
