import { describe, it, expect } from "vitest";
import {
	buildAllWindowsFeedback,
	captureTmuxTarget,
	buildBackgroundSvg,
	buildWindowFeedback,
	CURRENT_WINDOW_ARGS,
	currentWindowArgs,
	lastSessionArgs,
	lastWindowArgs,
	nextWindowAcross,
	parseActiveFlags,
	parseCurrentWindow,
	selectWindowDirArgs,
	sessionHue,
	switchToWindowArgs,
	toggleScope,
	windowFlagsArgs,
} from "../src/mac/tmux-window.js";
import { parseWindows, resolveTarget, type TmuxWindow } from "../src/mac/tmux.js";

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
		expect(CURRENT_WINDOW_ARGS).toEqual([
			"display-message",
			"-p",
			"#{session_name}|#{window_index}|#{window_name}",
		]);
		expect(windowFlagsArgs()).toEqual(["list-windows", "-F", "#{window_active}"]);
	});
	it("session-scoped args target the frontmost window's session", () => {
		expect(lastWindowArgs("dev")).toEqual(["last-window", "-t", "dev"]);
		expect(currentWindowArgs("dev")).toEqual([
			"display-message",
			"-p",
			"-t",
			"dev",
			"#{session_name}|#{window_index}|#{window_name}",
		]);
		expect(windowFlagsArgs("dev")).toEqual(["list-windows", "-F", "#{window_active}", "-t", "dev"]);
	});
});

describe("parseCurrentWindow", () => {
	it("parses session|index|name (name last)", () => {
		expect(parseCurrentWindow("dev|2|movingavg\n")).toEqual({
			session: "dev",
			name: "movingavg",
			index: 2,
		});
	});
	it("keeps a pipe in the window name (joined tail)", () => {
		expect(parseCurrentWindow("dev|4|api|logs").name).toBe("api|logs");
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
	{ session: "dev", index: 1, name: "vim", active: true, id: "@1", server: "100-1" },
	{ session: "dev", index: 2, name: "logs", active: false, id: "@2", server: "100-1" },
	{ session: "ops", index: 1, name: "deploy", active: true, id: "@3", server: "100-1" },
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
	it("switchToWindowArgs pins the CLIENT with -c so a background client never moves", () => {
		expect(switchToWindowArgs(ALL_WINDOWS[2], "/dev/ttys007")).toEqual([
			"switch-client",
			"-c",
			"/dev/ttys007",
			"-t",
			"ops:1",
		]);
	});
	it("lastSessionArgs toggles the given client's previous session", () => {
		expect(lastSessionArgs("/dev/ttys007")).toEqual(["switch-client", "-c", "/dev/ttys007", "-l"]);
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
	// The window list is the ONE snapshot capture reads: the active row of the
	// front session is the captured window, and the target must resolve to it.
	it("captures the front session's active window by name when the name is unique", () => {
		const windows = parseWindows("dev|2|1|@2|100-1|movingavg\ndev|3|0|@3|100-1|logs\nops|1|1|@9|100-1|deploy\n");
		expect(captureTmuxTarget(windows, "dev")).toBe("dev:movingavg");
	});
	it("captures by window id when another window in the session has the same name", () => {
		// The live bug: dev:7 and dev:8 were both auto-named "claude"; "dev:claude"
		// resolved to 7, so a key captured from 8 never lit and raised the wrong window.
		const windows = parseWindows("dev|7|0|@7|100-1|claude\ndev|8|1|@8|100-1|claude\n");
		const target = captureTmuxTarget(windows, "dev");
		expect(target).toBe("dev:@8#100-1");
		// renumber-windows on: window 7 closes, @8 becomes index 7. Still the same window.
		expect(resolveTarget(parseWindows("dev|7|1|@8|100-1|claude\n"), target)?.id).toBe("@8");
	});
	it("reads the active window of the FRONT session, not another session's", () => {
		const windows = parseWindows("ops|1|1|@1|100-1|claude\ndev|7|0|@7|100-1|claude\ndev|8|1|@8|100-1|claude\n");
		expect(captureTmuxTarget(windows, "ops")).toBe("ops:claude");
		expect(captureTmuxTarget(windows, "dev")).toBe("dev:@8#100-1");
	});
	it("returns \"\" when the session has no active window in the list", () => {
		expect(captureTmuxTarget(parseWindows("dev|7|0|@7|100-1|claude\n"), "dev")).toBe("");
		expect(captureTmuxTarget([], "dev")).toBe("");
	});
	it("returns \"\" when there is no session (no tmux server)", () => {
		expect(captureTmuxTarget(parseWindows("  |0|1|@0|100-1|x\n"), "  ")).toBe("");
	});
});
