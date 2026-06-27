import { describe, it, expect } from "vitest";
import {
	sameWindow,
	indexOfWindow,
	toggleWindow,
	nextIndex,
	buildRingImage,
	type RingWindow,
} from "../src/mac/window-ring.js";

const a: RingWindow = { app: "BBEdit", title: "notes.md" };
const b: RingWindow = { app: "Finder", title: "Downloads" };
const c: RingWindow = { app: "Terminal", title: "tmux" };

describe("sameWindow / indexOfWindow", () => {
	it("matches on app AND title", () => {
		expect(sameWindow(a, { app: "BBEdit", title: "notes.md" })).toBe(true);
		expect(sameWindow(a, { app: "BBEdit", title: "other.md" })).toBe(false);
		expect(sameWindow(a, { app: "Xcode", title: "notes.md" })).toBe(false);
	});
	it("finds the index or -1", () => {
		expect(indexOfWindow([a, b], b)).toBe(1);
		expect(indexOfWindow([a, b], c)).toBe(-1);
	});
});

describe("toggleWindow", () => {
	it("adds a new window", () => {
		const { list, added } = toggleWindow([a], b);
		expect(added).toBe(true);
		expect(list).toEqual([a, b]);
	});
	it("removes a window already present", () => {
		const { list, added } = toggleWindow([a, b], a);
		expect(added).toBe(false);
		expect(list).toEqual([b]);
	});
	it("never adds a window with an empty app", () => {
		const { list, added } = toggleWindow([a], { app: "", title: "" });
		expect(added).toBe(false);
		expect(list).toEqual([a]);
	});
	it("does not mutate the input list", () => {
		const input = [a];
		toggleWindow(input, b);
		expect(input).toEqual([a]);
	});
});

describe("nextIndex", () => {
	it("first tap (cursor -1) lands on 0", () => {
		expect(nextIndex(3, -1)).toBe(0);
	});
	it("advances and wraps", () => {
		expect(nextIndex(3, 0)).toBe(1);
		expect(nextIndex(3, 2)).toBe(0);
	});
	it("handles an out-of-range or non-integer cursor", () => {
		expect(nextIndex(3, 5)).toBe(0);
		expect(nextIndex(3, Number.NaN)).toBe(0);
	});
	it("returns 0 for an empty ring", () => {
		expect(nextIndex(0, 4)).toBe(0);
	});
});

describe("buildRingImage", () => {
	it("shows the count and a green ring when the current window is in the list", () => {
		const svg = buildRingImage(3, true);
		expect(svg).toContain(">3<");
		expect(svg).toContain("#2ecc71");
	});
	it("uses a grey ring when the current window is not in the list", () => {
		const svg = buildRingImage(0, false);
		expect(svg).toContain(">0<");
		expect(svg).toContain("#5a5a5e");
		expect(svg).not.toContain("#2ecc71");
	});
	it("overlays a red minus for the 'removed' badge", () => {
		const svg = buildRingImage(2, false, "removed");
		expect(svg).toContain("#e74c3c"); // red badge
		expect(svg).toContain(">2<"); // shows the new count
	});
	it("has no red badge in the normal image", () => {
		expect(buildRingImage(2, true)).not.toContain("#e74c3c");
	});
});
