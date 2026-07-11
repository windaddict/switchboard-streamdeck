import { describe, it, expect } from "vitest";
import {
	claudeStateForWindow,
	LIST_PANES_ARGS,
	parsePanes,
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
});
