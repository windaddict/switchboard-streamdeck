import { describe, it, expect } from "vitest";
import {
	cells,
	isSchemeKey,
	nextTile,
	SCHEMES,
	type TileSettings,
} from "../src/mac/tile.js";

describe("cells — geometry", () => {
	it("halvesH yields left then right, full height", () => {
		expect(cells(SCHEMES.halvesH)).toEqual([
			{ x: 0, y: 0, w: 0.5, h: 1 },
			{ x: 0.5, y: 0, w: 0.5, h: 1 },
		]);
	});

	it("halvesV yields top then bottom, full width", () => {
		expect(cells(SCHEMES.halvesV)).toEqual([
			{ x: 0, y: 0, w: 1, h: 0.5 },
			{ x: 0, y: 0.5, w: 1, h: 0.5 },
		]);
	});

	it("thirdsH yields three columns L→R", () => {
		const xs = cells(SCHEMES.thirdsH).map((c) => c.x);
		expect(xs).toEqual([0, 1 / 3, 2 / 3]);
		expect(cells(SCHEMES.thirdsH).every((c) => c.w === 1 / 3 && c.h === 1)).toBe(true);
	});

	it("quartersV yields four rows T→B", () => {
		const ys = cells(SCHEMES.quartersV).map((c) => c.y);
		expect(ys).toEqual([0, 0.25, 0.5, 0.75]);
		expect(cells(SCHEMES.quartersV).every((c) => c.h === 0.25 && c.w === 1)).toBe(true);
	});
});

describe("cells — serpentine order gives clockwise on 2-row grids", () => {
	it("grid2x2 (quarters) walks TL → TR → BR → BL", () => {
		expect(cells(SCHEMES.grid2x2)).toEqual([
			{ x: 0, y: 0, w: 0.5, h: 0.5 }, // TL
			{ x: 0.5, y: 0, w: 0.5, h: 0.5 }, // TR
			{ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, // BR
			{ x: 0, y: 0.5, w: 0.5, h: 0.5 }, // BL
		]);
	});

	it("grid2x3 top row L→R then bottom row R→L", () => {
		const c = cells(SCHEMES.grid2x3);
		expect(c.map((p) => [p.x, p.y])).toEqual([
			[0, 0],
			[1 / 3, 0],
			[2 / 3, 0],
			[2 / 3, 0.5],
			[1 / 3, 0.5],
			[0, 0.5],
		]);
	});

	it("grid2x4 has 8 cells, half-height quarter-width", () => {
		const c = cells(SCHEMES.grid2x4);
		expect(c).toHaveLength(8);
		expect(c.every((p) => p.w === 0.25 && p.h === 0.5)).toBe(true);
	});
});

describe("nextTile — window follows the dial (thirds, both directions)", () => {
	const base: TileSettings = { cwScheme: "thirdsH", ccwScheme: "thirdsH" };

	it("clockwise walks far-left → middle → right", () => {
		const a = nextTile(base, "next"); // fresh
		expect(a.index).toBe(0); // far left
		const b = nextTile({ ...base, activeScheme: "thirdsH", index: a.index }, "next");
		expect(b.index).toBe(1); // middle
		const c = nextTile({ ...base, activeScheme: "thirdsH", index: b.index }, "next");
		expect(c.index).toBe(2); // right
	});

	it("counter-clockwise walks far-right → middle → far-left", () => {
		const a = nextTile(base, "prev"); // fresh
		expect(a.index).toBe(2); // far right
		const b = nextTile({ ...base, activeScheme: "thirdsH", index: a.index }, "prev");
		expect(b.index).toBe(1); // middle
		const c = nextTile({ ...base, activeScheme: "thirdsH", index: b.index }, "prev");
		expect(c.index).toBe(0); // far left
	});

	it("reversing direction mid-sequence retraces (CW to middle, CCW back to left)", () => {
		const mid = nextTile({ ...base, activeScheme: "thirdsH", index: 0 }, "next");
		expect(mid.index).toBe(1);
		const back = nextTile({ ...base, activeScheme: "thirdsH", index: mid.index }, "prev");
		expect(back.index).toBe(0);
	});

	it("clockwise wraps right → far-left; counter-clockwise wraps left → far-right", () => {
		expect(nextTile({ ...base, activeScheme: "thirdsH", index: 2 }, "next").index).toBe(0);
		expect(nextTile({ ...base, activeScheme: "thirdsH", index: 0 }, "prev").index).toBe(2);
	});
});

describe("nextTile — quarters orbit follows the dial", () => {
	const base: TileSettings = { cwScheme: "grid2x2", ccwScheme: "grid2x2" };

	it("clockwise orbits TL → TR → BR → BL (indices 0,1,2,3)", () => {
		let idx = -1;
		const seen: number[] = [];
		for (let i = 0; i < 4; i++) {
			const step = nextTile({ ...base, activeScheme: "grid2x2", index: idx }, "next");
			seen.push(step.index);
			idx = step.index;
		}
		expect(seen).toEqual([0, 1, 2, 3]);
	});

	it("counter-clockwise orbits TL → BL → BR → TR (indices 0,3,2,1)", () => {
		const seen: number[] = [];
		// start placed at TL (index 0), then turn CCW repeatedly
		let idx = 0;
		for (let i = 0; i < 4; i++) {
			const step = nextTile({ ...base, activeScheme: "grid2x2", index: idx }, "prev");
			seen.push(step.index);
			idx = step.index;
		}
		expect(seen).toEqual([3, 2, 1, 0]);
	});
});

describe("nextTile — different schemes per direction", () => {
	const mixed: TileSettings = { cwScheme: "thirdsH", ccwScheme: "grid2x2" };

	it("clockwise uses the cw scheme forward from cell 0", () => {
		const step = nextTile(mixed, "next");
		expect(step.activeScheme).toBe("thirdsH");
		expect(step.index).toBe(0);
	});

	it("switching to counter-clockwise re-enters the ccw scheme at its last cell", () => {
		const step = nextTile({ ...mixed, activeScheme: "thirdsH", index: 1 }, "prev");
		expect(step.activeScheme).toBe("grid2x2");
		expect(step.index).toBe(3); // reverse entry = last cell
	});

	it("continuing counter-clockwise steps the ccw scheme in reverse", () => {
		const step = nextTile({ ...mixed, activeScheme: "grid2x2", index: 3 }, "prev");
		expect(step.index).toBe(2);
	});
});

describe("nextTile — defaults + guards", () => {
	it("falls back to the default scheme when settings are empty", () => {
		const step = nextTile({}, "next");
		expect(step.activeScheme).toBe("grid2x2");
		expect(step.index).toBe(0);
	});

	it("ignores a bogus scheme value and uses the default", () => {
		const step = nextTile({ cwScheme: "nope" as never }, "next");
		expect(step.activeScheme).toBe("grid2x2");
	});
});

describe("isSchemeKey", () => {
	it("accepts a real key and rejects junk", () => {
		expect(isSchemeKey("grid2x4")).toBe(true);
		expect(isSchemeKey("toString")).toBe(false);
		expect(isSchemeKey(undefined)).toBe(false);
	});
});
