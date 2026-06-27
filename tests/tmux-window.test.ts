import { describe, it, expect } from "vitest";
import {
	windowDirection,
	selectWindowDirArgs,
	parseCurrentWindow,
	parseActiveFlags,
	sessionHue,
	buildBackgroundSvg,
	svgToDataUri,
	buildWindowFeedback,
	LAST_WINDOW_ARGS,
	CURRENT_WINDOW_ARGS,
	WINDOW_FLAGS_ARGS,
} from "../src/mac/tmux-window.js";

describe("windowDirection & args", () => {
	it("positive => next, negative => prev, zero => none", () => {
		expect(windowDirection(2)).toBe("next");
		expect(windowDirection(-1)).toBe("prev");
		expect(windowDirection(0)).toBe("none");
	});
	it("selectWindowDirArgs maps to tmux next/previous-window", () => {
		expect(selectWindowDirArgs("next")).toEqual(["next-window"]);
		expect(selectWindowDirArgs("prev")).toEqual(["previous-window"]);
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

describe("svgToDataUri", () => {
	it("produces a base64 svg data uri that round-trips", () => {
		const uri = svgToDataUri("<svg/>");
		expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
		const b64 = uri.slice("data:image/svg+xml;base64,".length);
		expect(Buffer.from(b64, "base64").toString("utf8")).toBe("<svg/>");
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
