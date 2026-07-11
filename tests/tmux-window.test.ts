import { describe, it, expect } from "vitest";
import {
	buildAllWindowsFeedback,
	captureTmuxTarget,
	buildBackgroundSvg,
	buildWindowFeedback,
	CURRENT_WINDOW_ARGS,
	LAST_SESSION_ARGS,
	LAST_WINDOW_ARGS,
	nextWindowAcross,
	parseActiveFlags,
	parseCurrentWindow,
	selectWindowDirArgs,
	sessionHue,
	switchToWindowArgs,
	toggleScope,
	WINDOW_FLAGS_ARGS,
} from "../src/mac/tmux-window.js";
import type { TmuxWindow } from "../src/mac/tmux.js";

describe("window dial args", () => {
	it("selectWindowDirArgs maps to tmux next/previous-window", () => {
		expect(selectWindowDirArgs("next")).toEqual(["next-window"]);
		expect(selectWindowDirArgs("prev")).toEqual(["previous-window"]);
	});
	it("selectWindowDirArgs scopes to a session when given (frontmost-window fix)", () => {
		expect(selectWindowDirArgs("next", "dev")).toEqual(["next-window", "-t", "dev"]);
		expect(selectWindowDirArgs("prev", null)).toEqual(["previous-window"]);
	});
	it("constant args are correct", () => {
		expect(LAST_WINDOW_ARGS).toEqual(["last-window"]);
		expect(CURRENT_WINDOW_ARGS).toEqual([
			"display-message",
			"-p",
			"#{session_name}|#{window_name}|#{window_index}",
		]);
		expect(WINDOW_FLAGS_ARGS).toEqual(["list-windows", "-F", "#{window_active}"]);
	});
});

describe("parseCurrentWindow", () => {
	it("parses session|name|index", () => {
		expect(parseCurrentWindow("dev|movingavg|2\n")).toEqual({
			session: "dev",
			name: "movingavg",
			index: 2,
		});
	});
	it("defaults a missing/invalid index to 0", () => {
		expect(parseCurrentWindow("dev|w").index).toBe(0);
	});
});

describe("parseActiveFlags", () => {
	it("maps '1' to true preserving order, skipping blanks", () => {
		expect(parseActiveFlags("0\n1\n0\n")).toEqual([false, true, false]);
	});
});

describe("sessionHue", () => {
	it("is deterministic and in range", () => {
		const h = sessionHue("dev");
		expect(h).toBe(sessionHue("dev"));
		expect(h).toBeGreaterThanOrEqual(0);
		expect(h).toBeLessThan(360);
	});
	it("differs for different sessions", () => {
		expect(sessionHue("dev")).not.toBe(sessionHue("apps"));
	});
});

describe("buildBackgroundSvg", () => {
	it("is a 200x100 svg with one dot per window and the names rendered", () => {
		const svg = buildBackgroundSvg({
			hue: 120,
			session: "dev",
			window: "movingavg",
			count: 3,
			activeIndex: 1,
		});
		expect(svg).toContain('width="200" height="100"');
		expect((svg.match(/<circle /g) ?? []).length).toBe(3);
		expect(svg).toContain("hsl(120,");
		expect(svg).toContain("DEV");
		expect(svg).toContain("movingavg");
	});
	it("renders no dots when there are no windows", () => {
		const svg = buildBackgroundSvg({
			hue: 120,
			session: "dev",
			window: "x",
			count: 0,
			activeIndex: -1,
		});
		expect(svg).not.toContain("<circle");
	});
	it("XML-escapes window names (no injection into the SVG)", () => {
		const svg = buildBackgroundSvg({
			hue: 0,
			session: "s",
			window: 'a<b>&"x',
			count: 1,
			activeIndex: 0,
		});
		expect(svg).toContain("a&lt;b&gt;&amp;&quot;x");
		expect(svg).not.toContain("<b>");
	});
});

describe("buildWindowFeedback", () => {
	it("returns a bg data uri whose SVG shows the session and window", () => {
		const fb = buildWindowFeedback({ session: "dev", name: "movingavg", index: 2 }, [
			false,
			true,
			false,
		]);
		expect(fb.bg.startsWith("data:image/svg+xml;base64,")).toBe(true);
		const svg = Buffer.from(
			fb.bg.slice("data:image/svg+xml;base64,".length),
			"base64",
		).toString("utf8");
		expect(svg).toContain("DEV");
		expect(svg).toContain("movingavg");
		expect((svg.match(/<circle /g) ?? []).length).toBe(3);
	});
});

describe("toggleScope", () => {
	it("flips between session and all", () => {
		expect(toggleScope("session")).toBe("all");
		expect(toggleScope("all")).toBe("session");
	});
});

const ALL_WINDOWS: TmuxWindow[] = [
	{ session: "dev", index: 1, name: "vim", active: true },
	{ session: "dev", index: 2, name: "logs", active: false },
	{ session: "ops", index: 1, name: "deploy", active: true },
];

describe("nextWindowAcross", () => {
	const current = { session: "dev", name: "logs", index: 2 };
	it("steps forward across a session boundary", () => {
		expect(nextWindowAcross(ALL_WINDOWS, current, "next")).toEqual(ALL_WINDOWS[2]);
	});
	it("steps backward within a session", () => {
		expect(nextWindowAcross(ALL_WINDOWS, current, "prev")).toEqual(ALL_WINDOWS[0]);
	});
	it("wraps from the last window to the first", () => {
		expect(nextWindowAcross(ALL_WINDOWS, { session: "ops", name: "deploy", index: 1 }, "next")).toEqual(
			ALL_WINDOWS[0],
		);
	});
	it("falls back to the first window when the current one is unknown", () => {
		expect(nextWindowAcross(ALL_WINDOWS, { session: "gone", name: "?", index: 9 }, "next")).toEqual(
			ALL_WINDOWS[0],
		);
	});
	it("returns null for an empty list", () => {
		expect(nextWindowAcross([], current, "next")).toBeNull();
	});
});

describe("all-scope args", () => {
	it("switchToWindowArgs uses switch-client (select-window cannot leave the session)", () => {
		expect(switchToWindowArgs(ALL_WINDOWS[2])).toEqual(["switch-client", "-t", "ops:1"]);
	});
	it("LAST_SESSION_ARGS toggles the previous session", () => {
		expect(LAST_SESSION_ARGS).toEqual(["switch-client", "-l"]);
	});
});

describe("buildBackgroundSvg — badge + dense dots", () => {
	const base = { hue: 200, session: "dev", window: "vim", count: 3, activeIndex: 0 };
	it("renders the badge text when given", () => {
		expect(buildBackgroundSvg({ ...base, badge: "ALL" })).toContain(">ALL</text>");
	});
	it("omits the badge by default", () => {
		expect(buildBackgroundSvg(base)).not.toContain("ALL");
	});
	it("XML-escapes the badge", () => {
		expect(buildBackgroundSvg({ ...base, badge: "<&>" })).toContain("&lt;&amp;&gt;");
	});
	it("keeps a dense dot row inside the 200px strip", () => {
		const svg = buildBackgroundSvg({ ...base, count: 30, activeIndex: 29 });
		const xs = [...svg.matchAll(/circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
		expect(xs).toHaveLength(30);
		expect(Math.min(...xs)).toBeGreaterThanOrEqual(5);
		expect(Math.max(...xs)).toBeLessThanOrEqual(195);
	});
});

describe("buildAllWindowsFeedback", () => {
	it("marks the current window across the flattened all-sessions list", () => {
		const fb = buildAllWindowsFeedback(ALL_WINDOWS, { session: "ops", name: "deploy", index: 1 });
		expect(fb.bg.startsWith("data:image/svg+xml;base64,")).toBe(true);
		const svg = Buffer.from(fb.bg.split(",")[1], "base64").toString();
		expect(svg).toContain(">ALL</text>");
		// three dots, third one active (r=4)
		expect([...svg.matchAll(/<circle /g)]).toHaveLength(3);
		expect(svg).toContain("OPS"); // session label uppercased
	});
});

describe("captureTmuxTarget", () => {
	it("formats session:name (the dropdown's persisted form)", () => {
		expect(captureTmuxTarget({ session: "dev", name: "movingavg", index: 3 })).toBe("dev:movingavg");
	});
	it("returns \"\" when there is no session (no tmux server)", () => {
		expect(captureTmuxTarget({ session: "", name: "", index: 0 })).toBe("");
		expect(captureTmuxTarget({ session: "  ", name: "x", index: 0 })).toBe("");
	});
});
