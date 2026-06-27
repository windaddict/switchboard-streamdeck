import { describe, it, expect } from "vitest";
import {
	scrollLines,
	FAST_MULTIPLIER,
	nextSpeed,
	jumpTopPlan,
	normalizeLinesPerTick,
	buildKeystrokeScript,
} from "../src/mac/scroll.js";

describe("scrollLines", () => {
	it("slow down: scrollLines(1, 'slow', 3) => 3 (positive = down)", () => {
		expect(scrollLines(1, "slow", 3)).toBe(3);
	});

	it("slow up: scrollLines(-2, 'slow', 3) => -6 (negative = up)", () => {
		expect(scrollLines(-2, "slow", 3)).toBe(-6);
	});

	it("fast down scales by FAST_MULTIPLIER: scrollLines(1, 'fast', 3) => 15", () => {
		expect(scrollLines(1, "fast", 3)).toBe(3 * FAST_MULTIPLIER);
	});

	it("fast up: scrollLines(-2, 'fast', 3) => -30", () => {
		expect(scrollLines(-2, "fast", 3)).toBe(-6 * FAST_MULTIPLIER);
	});

	it("linesPerTick actually scales the result (2 vs 6 differ)", () => {
		expect(scrollLines(1, "slow", 2)).toBe(2);
		expect(scrollLines(1, "slow", 6)).toBe(6);
	});

	it("zero ticks => 0 (no-op)", () => {
		expect(scrollLines(0, "slow", 3)).toBe(0);
	});

	it("omitted linesPerTick defaults to 3", () => {
		expect(scrollLines(1, "slow")).toBe(3);
	});

	it("truncates fractional ticks toward zero", () => {
		expect(scrollLines(2.9, "slow", 2)).toBe(4);
		expect(scrollLines(-2.9, "fast", 1)).toBe(-2 * FAST_MULTIPLIER);
	});

	it("FAST_MULTIPLIER is 5", () => {
		expect(FAST_MULTIPLIER).toBe(5);
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
