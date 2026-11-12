import { describe, it, expect } from "vitest";
import { LIST_PANE_TTYS_ARGS, parsePaneTtys, titleWorking } from "../src/mac/claude-state.js";

describe("parsePaneTtys", () => {
	const OUT = [
		"/dev/ttys019|dev|1|ea-system|1|1|claude|⠐ Building the app",
		"/dev/ttys020|dev|1|ea-system|0|1|fish|~/code",
		"/dev/ttys021|dev|2|movingavg|1|0|claude|✳ Done | done",
	].join("\n");
	it("parses tty/session/index/activity/command/title (title last, pipes kept)", () => {
		const panes = parsePaneTtys(OUT);
		expect(panes[0]).toEqual({
			tty: "/dev/ttys019",
			session: "dev",
			windowIndex: 1,
			windowName: "ea-system",
			receivesKeys: true,
			command: "claude",
			title: "⠐ Building the app",
		});
		expect(panes[2].title).toBe("✳ Done | done");
	});
	it("receivesKeys requires BOTH pane-active and window-active", () => {
		const panes = parsePaneTtys(OUT);
		expect(panes[1].receivesKeys).toBe(false); // inactive pane
		expect(panes[2].receivesKeys).toBe(false); // active pane, background window
	});
	it("format asks for the title last", () => {
		expect(LIST_PANE_TTYS_ARGS[3].endsWith("#{pane_title}")).toBe(true);
	});
});

describe("titleWorking", () => {
	it("braille = working, ✳ = waiting, empty = unknown", () => {
		expect(titleWorking("⠐ Fixing")).toBe(true);
		expect(titleWorking("✳ Ready")).toBe(false);
		expect(titleWorking("")).toBeNull();
		expect(titleWorking("   ")).toBeNull();
	});
	it("reads the marker after leading whitespace", () => {
		expect(titleWorking("  ⠐ Fixing")).toBe(true);
	});
	it("braille detection covers the whole block, not one frame", () => {
		for (const frame of ["⠋", "⠙", "⣽", "⢿", "⡿"]) {
			expect(titleWorking(`${frame} x`), `title: braille frame ${frame} reads working`).toBe(true);
		}
	});
	it("a braille-leading title without the marker+space shape is not working", () => {
		expect(titleWorking("⠐⠑⠒ progress-bar"), "title: braille run without a space is not the spinner").toBe(false);
	});
});

describe("parsePaneTtys — malformed guard", () => {
	it("skips a line whose window index is not numeric (never window 0 from garbage)", () => {
		expect(parsePaneTtys("/dev/ttys001|dev|x|w|1|1|claude|t")).toEqual([]);
	});
});

it("the half-circle spinner (◐◑◒◓) reads working in titleWorking", () => {
	expect(titleWorking("◐ Doing stuff"), "title: half-circle spinner reads working").toBe(true);
	for (const frame of ["◑", "◒", "◓"]) expect(titleWorking(`${frame} Doing stuff`)).toBe(true);
});

it("a bare ◐ without the marker+space shape is not Claude", () => {
	expect(titleWorking("◐◑◒ progress")).toBe(false);
});
