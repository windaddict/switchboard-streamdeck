import { describe, it, expect } from "vitest";
import {
	captureTarget,
	resolveTarget,
	normalizeIndex,
	derivePattern,
	type TargetSettings,
} from "../src/safari/targets.js";

describe("normalizeIndex", () => {
	it('coerces the string "3" to 3', () => {
		expect(normalizeIndex("3")).toBe(3);
	});
	it("passes through the number 3", () => {
		expect(normalizeIndex(3)).toBe(3);
	});
	it("defaults undefined to 0", () => {
		expect(normalizeIndex(undefined)).toBe(0);
	});
	it("clamps negatives to 0", () => {
		expect(normalizeIndex(-1)).toBe(0);
	});
	it('treats non-numeric "abc" as 0', () => {
		expect(normalizeIndex("abc")).toBe(0);
	});
	it("floors 2.9 to 2", () => {
		expect(normalizeIndex(2.9)).toBe(2);
	});
});

describe("derivePattern", () => {
	it("strips trailing slashes from host + path", () => {
		expect(derivePattern("https://example.com/app/")).toBe("example.com/app");
	});
	it("returns host + path with no trailing slash already", () => {
		expect(derivePattern("https://example.com/app")).toBe("example.com/app");
	});
	it("returns trimmed input for an invalid URL", () => {
		expect(derivePattern("  not a url  ")).toBe("not a url");
	});
});

describe("resolveTarget — gmail", () => {
	it("resolves account 0", () => {
		const r = resolveTarget({ service: "gmail", accountIndex: 0 });
		expect(r.url).toBe("https://mail.google.com/mail/u/0/");
		expect(r.urlPattern).toBe("mail.google.com/mail/u/0");
		expect(r.private).toBe(false);
	});
	it("resolves account 2 (number)", () => {
		const r = resolveTarget({ service: "gmail", accountIndex: 2 });
		expect(r.url).toBe("https://mail.google.com/mail/u/2/");
		expect(r.urlPattern).toBe("mail.google.com/mail/u/2");
	});
	it('resolves account "2" (string) the same as 2 — multi-account', () => {
		const r = resolveTarget({ service: "gmail", accountIndex: "2" });
		expect(r.url).toBe("https://mail.google.com/mail/u/2/");
		expect(r.urlPattern).toBe("mail.google.com/mail/u/2");
	});
});

describe("resolveTarget — calendar", () => {
	it("resolves account 1 with the /r suffix", () => {
		const r = resolveTarget({ service: "calendar", accountIndex: 1 });
		expect(r.url).toBe("https://calendar.google.com/calendar/u/1/r");
		expect(r.urlPattern).toBe("calendar.google.com/calendar/u/1");
	});
});

describe("resolveTarget — custom", () => {
	it("passes the url through and derives the pattern", () => {
		const r = resolveTarget({ service: "custom", url: "https://example.com/app" });
		expect(r.url).toBe("https://example.com/app");
		expect(r.urlPattern).toBe("example.com/app");
	});
	it("uses an explicit urlPattern override instead of the derived one", () => {
		const r = resolveTarget({
			service: "custom",
			url: "https://example.com/app",
			urlPattern: "my-custom-pattern",
		});
		expect(r.urlPattern).toBe("my-custom-pattern");
	});
});

describe("resolveTarget — shared behavior", () => {
	it("propagates private:true to ResolvedTarget.private", () => {
		const r = resolveTarget({ service: "gmail", accountIndex: 0, private: true });
		expect(r.private).toBe(true);
	});
	it("trims a titlePattern", () => {
		const r = resolveTarget({ service: "gmail", titlePattern: "  Inbox  " });
		expect(r.titlePattern).toBe("Inbox");
	});
	it("turns an empty/whitespace titlePattern into undefined", () => {
		const r = resolveTarget({ service: "gmail", titlePattern: "   " });
		expect(r.titlePattern).toBeUndefined();
	});
	it("leaves titlePattern undefined when absent", () => {
		const r = resolveTarget({ service: "gmail" });
		expect(r.titlePattern).toBeUndefined();
	});
	it("defaults service-less settings WITH a url to custom passthrough", () => {
		const settings: TargetSettings = { url: "https://foo.test/x/" };
		const r = resolveTarget(settings);
		expect(r.url).toBe("https://foo.test/x/");
		expect(r.urlPattern).toBe("foo.test/x");
	});
	it("infers Gmail when service is absent and there is no url (PI default not persisted)", () => {
		const r = resolveTarget({ accountIndex: "2" });
		expect(r.url).toBe("https://mail.google.com/mail/u/2/");
		expect(r.urlPattern).toBe("mail.google.com/mail/u/2");
	});
	it("infers Gmail account 0 from completely empty settings", () => {
		const r = resolveTarget({});
		expect(r.url).toBe("https://mail.google.com/mail/u/0/");
	});
});

describe("captureTarget", () => {
	it("builds a custom target with a derived pattern", () => {
		const got = captureTarget("https://github.com/windaddict/switchboard-streamdeck/pulls", {});
		expect(got).toEqual({
			service: "custom",
			url: "https://github.com/windaddict/switchboard-streamdeck/pulls",
			urlPattern: "github.com/windaddict/switchboard-streamdeck/pulls",
			titlePattern: undefined,
		});
	});
	it("drops a stale titlePattern (it belonged to the old target)", () => {
		const got = captureTarget("https://example.com/a", { titlePattern: "Inbox" });
		expect(got?.titlePattern).toBeUndefined();
	});
	it("keeps the private flag (capture changes where, not how)", () => {
		expect(captureTarget("https://example.com/a", { private: true })?.private).toBe(true);
	});
	it("overrides a previous service preset", () => {
		const got = captureTarget("https://news.ycombinator.com/", { service: "gmail", accountIndex: 2 });
		expect(got?.service).toBe("custom");
		expect(got?.url).toBe("https://news.ycombinator.com/");
	});
	it("returns null for a blank URL (nothing worth saving)", () => {
		expect(captureTarget("", {})).toBeNull();
		expect(captureTarget("   ", { url: "https://keep.me" })).toBeNull();
	});
});
