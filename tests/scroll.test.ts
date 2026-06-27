import { describe, it, expect } from "vitest";
import {
	scrollPlan,
	nextSpeed,
	jumpTopPlan,
	normalizeLinesPerTick,
	buildKeystrokeScript,
} from "../src/mac/scroll.js";

describe("scrollPlan", () => {
	it("slow down: scrollPlan(1, 'slow', 3) => keyCode 125, repeats 3", () => {
		expect(scrollPlan(1, "slow", 3)).toMatchObject({ keyCode: 125, repeats: 3 });
	});

	it("slow up: scrollPlan(-2, 'slow', 3) => keyCode 126, repeats 6", () => {
		expect(scrollPlan(-2, "slow", 3)).toMatchObject({ keyCode: 126, repeats: 6 });
	});

	it("fast down: scrollPlan(2, 'fast') => keyCode 121, repeats 2", () => {
		expect(scrollPlan(2, "fast")).toMatchObject({ keyCode: 121, repeats: 2 });
	});

	it("fast up: scrollPlan(-1, 'fast') => keyCode 116, repeats 1", () => {
		expect(scrollPlan(-1, "fast")).toMatchObject({ keyCode: 116, repeats: 1 });
	});

	it("zero ticks => repeats 0", () => {
		expect(scrollPlan(0, "slow", 3).repeats).toBe(0);
	});

	it("slow with omitted linesPerTick uses default 3", () => {
		expect(scrollPlan(1, "slow").repeats).toBe(3);
	});

	it("modifiers are always [] for scrollPlan", () => {
		expect(scrollPlan(1, "slow", 3).modifiers).toEqual([]);
		expect(scrollPlan(-2, "slow", 5).modifiers).toEqual([]);
		expect(scrollPlan(3, "fast").modifiers).toEqual([]);
		expect(scrollPlan(-4, "fast").modifiers).toEqual([]);
		expect(scrollPlan(0, "slow").modifiers).toEqual([]);
	});

	it("truncates fractional ticks toward zero", () => {
		expect(scrollPlan(2.9, "fast").repeats).toBe(2);
		expect(scrollPlan(-2.9, "fast").repeats).toBe(2);
	});
});

describe("nextSpeed", () => {
	it("fast -> slow", () => {
		expect(nextSpeed("fast")).toBe("slow");
	});
	it("slow -> fast", () => {
		expect(nextSpeed("slow")).toBe("fast");
	});
});

describe("jumpTopPlan", () => {
	it("=> keyCode 126, repeats 1, modifiers ['command down']", () => {
		expect(jumpTopPlan()).toEqual({
			keyCode: 126,
			repeats: 1,
			modifiers: ["command down"],
		});
	});
});

describe("normalizeLinesPerTick", () => {
	it("'5' -> 5", () => {
		expect(normalizeLinesPerTick("5")).toBe(5);
	});
	it("undefined -> 3", () => {
		expect(normalizeLinesPerTick(undefined)).toBe(3);
	});
	it("0 -> 1", () => {
		expect(normalizeLinesPerTick(0)).toBe(1);
	});
	it("-2 -> 1", () => {
		expect(normalizeLinesPerTick(-2)).toBe(1);
	});
	it("2.9 -> 2", () => {
		expect(normalizeLinesPerTick(2.9)).toBe(2);
	});
	it("'abc' -> 3", () => {
		expect(normalizeLinesPerTick("abc")).toBe(3);
	});
});

describe("buildKeystrokeScript", () => {
	it("slow-down plan (125, repeats 3, []) has the loop and no 'using {' clause", () => {
		const script = buildKeystrokeScript({ keyCode: 125, repeats: 3, modifiers: [] });
		expect(script).toContain('tell application "System Events"');
		expect(script).toContain("repeat 3 times");
		expect(script).toContain("key code 125");
		expect(script).not.toContain("using {");
	});

	it("jumpTopPlan script contains 'key code 126 using {command down}'", () => {
		const script = buildKeystrokeScript(jumpTopPlan());
		expect(script).toContain("key code 126 using {command down}");
	});

	it("repeats:0 plan is a no-op with NO 'key code' substring", () => {
		const script = buildKeystrokeScript({ keyCode: 125, repeats: 0, modifiers: [] });
		expect(script).not.toContain("key code");
	});

	it("inserts a delay inside the loop so rapid synthetic keys are not coalesced", () => {
		const script = buildKeystrokeScript({ keyCode: 125, repeats: 3, modifiers: [] });
		const lines = script.split("\n");
		const start = lines.findIndex((l) => l.includes("repeat 3 times"));
		const end = lines.findIndex((l) => l.includes("end repeat"));
		const body = lines.slice(start + 1, end).join("\n");
		expect(body).toContain("key code 125");
		expect(body).toContain("delay ");
	});
});
