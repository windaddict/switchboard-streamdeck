import { describe, it, expect } from "vitest";
import { resolveApp, buildAppScript } from "../src/mac/apps.js";

describe("resolveApp", () => {
	it("trims appName and titlePattern", () => {
		const r = resolveApp({ appName: "  Safari  ", titlePattern: "  Inbox  " });
		expect(r.appName).toBe("Safari");
		expect(r.titlePattern).toBe("Inbox");
	});

	it("whitespace-only titlePattern becomes undefined", () => {
		const r = resolveApp({ appName: "Safari", titlePattern: "   " });
		expect(r.titlePattern).toBeUndefined();
	});

	it("missing titlePattern is undefined", () => {
		const r = resolveApp({ appName: "Safari" });
		expect(r.titlePattern).toBeUndefined();
	});

	it("whitespace-only appName becomes empty string", () => {
		const r = resolveApp({ appName: "   " });
		expect(r.appName).toBe("");
	});

	it("missing appName becomes empty string", () => {
		const r = resolveApp({});
		expect(r.appName).toBe("");
	});
});

describe("buildAppScript — no titlePattern", () => {
	it("emits a plain activate and no AXRaise", () => {
		const script = buildAppScript(resolveApp({ appName: "Safari" }));
		expect(script).toContain('tell application "Safari" to activate');
		expect(script).not.toContain("AXRaise");
		expect(script).not.toContain("System Events");
	});
});

describe("buildAppScript — with titlePattern", () => {
	it("emits System Events window-raising logic", () => {
		const script = buildAppScript(
			resolveApp({ appName: "Safari", titlePattern: "Inbox" }),
		);
		expect(script).toContain('tell application "Safari" to activate');
		expect(script).toContain('tell process "Safari"');
		expect(script).toContain("AXRaise");
		expect(script).toContain('contains "Inbox"');
	});
});

describe("buildAppScript — empty appName", () => {
	it('returns "" for resolveApp({})', () => {
		expect(buildAppScript(resolveApp({}))).toBe("");
	});

	it('returns "" for whitespace-only appName', () => {
		expect(buildAppScript(resolveApp({ appName: "  " }))).toBe("");
	});
});

describe("buildAppScript — injection safety", () => {
	it("escapes a double-quote breakout payload in titlePattern", () => {
		const payload = 'a" then tell application "Calculator" to activate -- ';
		const script = buildAppScript(
			resolveApp({ appName: "Safari", titlePattern: payload }),
		);

		// The escaped form must be present.
		expect(script).toContain('\\"');
		// The raw breakout string must NOT survive unescaped.
		expect(script).not.toContain(payload);

		// Isolate the interpolated window-name region and assert no unescaped
		// double-quote sneaks through (every " must be preceded by a backslash).
		const region = script.split("if name of w contains ")[1];
		expect(region).toBeDefined();
		// The raw `" then tell application "Calculator"` breakout must not appear.
		expect(region).not.toContain(' then tell application "Calculator"');
		// An unescaped quote (a `"` not preceded by `\`) only legitimately appears
		// as the closing delimiter; the payload's quote must be escaped to `\"`.
		expect(region).toContain('a\\" then');
	});

	it("escapes a double-quote payload in appName", () => {
		const payload = 'Safari" to activate\ntell application "Calculator';
		const script = buildAppScript(resolveApp({ appName: payload }));
		// Escaped quote present, raw breakout absent.
		expect(script).toContain('\\"');
		expect(script).not.toContain('Safari" to activate\ntell application "Calculator');
		expect(script).toContain('Safari\\" to activate');
	});

	it("escapes backslashes", () => {
		const script = buildAppScript(
			resolveApp({ appName: "Safari", titlePattern: "a\\b" }),
		);
		expect(script).toContain("a\\\\b");
	});
});
