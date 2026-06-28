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

describe("nextTile — same scheme on both directions (CCW reverses CW)", () => {
	const base: TileSettings = { cwScheme: "grid2x2", ccwScheme: "grid2x2" };

	it("first CW places at the first cell (index 0)", () => {
		const step = nextTile(base, "next");
		expect(step.index).toBe(0);
		expect(step.activeScheme).toBe("grid2x2");
		expect(step.position).toBe("1/4");
	});

	it("first CCW places at the last cell (counter-clockwise-most)", () => {
		const step = nextTile(base, "prev");
		expect(step.index).toBe(3);
		expect(step.position).toBe("4/4");
	});

	it("CW advances forward and wraps", () => {
		let s: TileSettings = { ...base, activeScheme: "grid2x2", index: 3 };
		expect(nextTile(s, "next").index).toBe(0); // wrap 3 → 0
		s = { ...base, activeScheme: "grid2x2", index: 1 };
		expect(nextTile(s, "next").index).toBe(2);
	});

	it("CW then CCW returns to where you started (exact inverse)", () => {
		const afterCw = nextTile({ ...base, activeScheme: "grid2x2", index: 1 }, "next");
		expect(afterCw.index).toBe(2);
		const afterCcw = nextTile(
			{ ...base, activeScheme: afterCw.activeScheme, index: afterCw.index },
			"prev",
		);
		expect(afterCcw.index).toBe(1);
	});

	it("CCW wraps 0 → last", () => {
		const s: TileSettings = { ...base, activeScheme: "grid2x2", index: 0 };
		expect(nextTile(s, "prev").index).toBe(3);
	});
});

describe("nextTile — different schemes per direction (independent forward cyclers)", () => {
	const mixed: TileSettings = { cwScheme: "halvesH", ccwScheme: "thirdsV" };

	it("CW uses the cw scheme starting at cell 0", () => {
		const step = nextTile(mixed, "next");
		expect(step.activeScheme).toBe("halvesH");
		expect(step.index).toBe(0);
		expect(step.position).toBe("1/2");
	});

	it("continuing CW advances forward within the cw scheme", () => {
		const step = nextTile({ ...mixed, activeScheme: "halvesH", index: 0 }, "next");
		expect(step.index).toBe(1);
		expect(step.position).toBe("2/2");
	});

	it("switching to CCW jumps to the ccw scheme's first cell", () => {
		const step = nextTile({ ...mixed, activeScheme: "halvesH", index: 1 }, "prev");
		expect(step.activeScheme).toBe("thirdsV");
		expect(step.index).toBe(0); // enters forward, not reversed
	});

	it("continuing CCW advances forward within the ccw scheme (not backward)", () => {
		const step = nextTile({ ...mixed, activeScheme: "thirdsV", index: 0 }, "prev");
		expect(step.index).toBe(1);
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
