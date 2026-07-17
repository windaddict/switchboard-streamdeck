import { describe, it, expect } from "vitest";
import {
	claudeStateForWindow,
	LIST_PANES_ARGS,
	LIST_PANE_TTYS_ARGS,
	parsePanes,
	parsePaneTtys,
	titleWorking,
} from "../src/mac/claude-state.js";

const OUTPUT = [
	"apps|1|copybug|claude|✳ Resolve TestFlight rejection",
	"apps|1|copybug|fish|~/c/copybug",
	"apps|4|switchboard|claude|⠐ Fix Gmail tab buttons in Streamdeck",
	"apps|4|switchboard|fish|~/c/switchboard",
	"dev|2|movingavg|fish|~/c/movingavg-website",
].join("\n");

describe("parsePanes", () => {
	it("parses session/windowIndex/windowName/command/title rows", () => {
		const panes = parsePanes(OUTPUT);
		expect(panes).toHaveLength(5);
		expect(panes[0]).toEqual({
			session: "apps",
			windowIndex: 1,
			windowName: "copybug",
			command: "claude",
			title: "✳ Resolve TestFlight rejection",
		});
	});
	it("keeps pipes inside the title (it is the LAST field)", () => {
		expect(parsePanes("s|1|w|claude|a | b")[0].title).toBe("a | b");
	});
	it("skips malformed lines and tolerates empty output", () => {
		expect(parsePanes("short|row\n\n")).toEqual([]);
		expect(parsePanes("")).toEqual([]);
	});
	it("LIST_PANES_ARGS asks for all panes with the title last", () => {
		expect(LIST_PANES_ARGS[1]).toBe("-a");
		expect(LIST_PANES_ARGS[3].endsWith("#{pane_title}")).toBe(true);
	});
});

describe("claudeStateForWindow", () => {
	const panes = parsePanes(OUTPUT);
	it("braille spinner title = working", () => {
		expect(claudeStateForWindow(panes, "apps", "switchboard")).toBe("working");
	});
	it("✳ title = waiting for input", () => {
		expect(claudeStateForWindow(panes, "apps", "copybug")).toBe("waiting");
	});
	it("no claude pane = none", () => {
		expect(claudeStateForWindow(panes, "dev", "movingavg")).toBe("none");
	});
	it("unknown window = none", () => {
		expect(claudeStateForWindow(panes, "ghost", "nowhere")).toBe("none");
	});
	it("any working pane outranks a waiting one in the same window", () => {
		const two = parsePanes("s|1|w|claude|✳ done\ns|1|w|claude|⣾ busy");
		expect(claudeStateForWindow(two, "s", "w")).toBe("working");
	});
	it("braille detection covers the whole block, not one frame", () => {
		for (const frame of ["⠋", "⠙", "⣽", "⢿", "⡿"]) {
			expect(claudeStateForWindow(parsePanes(`s|1|w|claude|${frame} x`), "s", "w")).toBe("working");
		}
	});
	it("a claude with a plain title counts as waiting (unknown-but-present)", () => {
		expect(claudeStateForWindow(parsePanes("s|1|w|claude|zsh"), "s", "w")).toBe("waiting");
	});
	it("a foreground shell tool does not hide a WORKING Claude — braille title keeps the pane matched", () => {
		// pane_current_command reports the running TOOL while Claude's OSC title persists
		expect(claudeStateForWindow(parsePanes("s|1|w|python3|⠐ Building the app"), "s", "w")).toBe("working");
	});
	it("a stale ✳ on a non-claude pane is NEVER adopted (dead sessions must not read waiting forever)", () => {
		expect(claudeStateForWindow(parsePanes("s|1|w|bash|✳ Done"), "s", "w")).toBe("none");
		expect(claudeStateForWindow(parsePanes("s|1|w|fish|~/code/x"), "s", "w")).toBe("none");
	});
	it("identity and state read the same trimmed bytes (leading whitespace)", () => {
		expect(claudeStateForWindow(parsePanes("s|1|w|python3|  ⠐ Building"), "s", "w")).toBe("working");
	});
	it("a braille-leading title WITHOUT the marker+space shape is not Claude", () => {
		expect(claudeStateForWindow(parsePanes("s|1|w|node|⠐⠑⠒ progress-bar"), "s", "w")).toBe("none");
	});

describe("parsePaneTtys", () => {
	const OUT = [
		"/dev/ttys019|dev|1|1|1|claude|⠐ Building the app",
		"/dev/ttys020|dev|1|0|1|fish|~/code",
		"/dev/ttys021|dev|2|1|0|claude|✳ Done | done",
	].join("\n");
	it("parses tty/session/index/activity/command/title (title last, pipes kept)", () => {
		const panes = parsePaneTtys(OUT);
		expect(panes[0]).toEqual({
			tty: "/dev/ttys019",
			session: "dev",
			windowIndex: 1,
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
});

describe("parsePaneTtys — malformed guard", () => {
	it("skips a line whose window index is not numeric (never window 0 from garbage)", () => {
		expect(parsePaneTtys("/dev/ttys001|dev|x|1|1|claude|t")).toEqual([]);
	});
});
});
