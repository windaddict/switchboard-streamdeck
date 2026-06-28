/**
 * Pure geometry + ordering for the "Arrange Window" dial. The dial walks the
 * frontmost window through the cells of a grid; each rotation direction is
 * configured with its own scheme. All arrangements reduce to a (cols × rows)
 * grid, and cells are visited in serpentine order (row 0 left→right, row 1
 * right→left, …) so a 2-row grid is traversed clockwise — e.g. quarters go
 * TL → TR → BR → BL, matching how you'd lay windows around the screen.
 *
 * This module is intentionally free of any macOS/AppleScript dependency: it
 * emits a normalized cell {x,y,w,h} in 0..1 of the screen's *visible* frame,
 * which the native helper maps to pixels and applies. That keeps the tricky
 * part (which cell, which direction, wrap-around) unit-testable.
 */

/** A target rectangle as fractions (0..1) of the screen's visible frame.
 * `y` is measured from the TOP (so {0,0,.5,.5} is the top-left quadrant). */
export type Cell = { x: number; y: number; w: number; h: number };

/** A scheme is just a grid shape; the label/keys live in SCHEMES below. */
export type Scheme = { cols: number; rows: number };

/** The arrangements offered in the property inspector, keyed by setting value.
 * Columns = divisions across the width; rows = divisions down the height. */
export const SCHEMES = {
	halvesH: { cols: 2, rows: 1 }, // left / right
	halvesV: { cols: 1, rows: 2 }, // top / bottom
	thirdsH: { cols: 3, rows: 1 }, // three columns
	thirdsV: { cols: 1, rows: 3 }, // three rows
	quartersH: { cols: 4, rows: 1 }, // four columns
	quartersV: { cols: 1, rows: 4 }, // four rows
	grid2x2: { cols: 2, rows: 2 }, // quarters: half height × half width
	grid2x3: { cols: 3, rows: 2 }, // half height × third width
	grid2x4: { cols: 4, rows: 2 }, // half height × quarter width
} as const satisfies Record<string, Scheme>;

export type SchemeKey = keyof typeof SCHEMES;

/** Short human labels for the touchscreen readout + the property inspector. */
export const SCHEME_LABELS: Record<SchemeKey, string> = {
	halvesH: "Halves ↔",
	halvesV: "Halves ↕",
	thirdsH: "Thirds ↔",
	thirdsV: "Thirds ↕",
	quartersH: "Quarters ↔",
	quartersV: "Quarters ↕",
	grid2x2: "2×2 grid",
	grid2x3: "2×3 grid",
	grid2x4: "2×4 grid",
};

export const DEFAULT_SCHEME: SchemeKey = "grid2x2";

export function isSchemeKey(s: string | undefined): s is SchemeKey {
	return s !== undefined && Object.prototype.hasOwnProperty.call(SCHEMES, s);
}

function resolveScheme(s: SchemeKey | undefined): SchemeKey {
	return isSchemeKey(s) ? s : DEFAULT_SCHEME;
}

/**
 * The ordered cells of a scheme, in serpentine order. Even rows run
 * left→right, odd rows right→left, so a 2-row grid walks clockwise.
 */
export function cells(scheme: Scheme): Cell[] {
	const { cols, rows } = scheme;
	const cw = 1 / cols;
	const ch = 1 / rows;
	const out: Cell[] = [];
	for (let r = 0; r < rows; r++) {
		const row: Cell[] = [];
		for (let c = 0; c < cols; c++) {
			row.push({ x: c * cw, y: r * ch, w: cw, h: ch });
		}
		if (r % 2 === 1) row.reverse();
		out.push(...row);
	}
	return out;
}

/** The full-screen cell used by the press-to-maximize action. */
export const FULL_CELL: Cell = { x: 0, y: 0, w: 1, h: 1 };

export type TileSettings = {
	/** Scheme used when the dial turns clockwise (positive ticks). */
	cwScheme?: SchemeKey;
	/** Scheme used when the dial turns counter-clockwise (negative ticks). */
	ccwScheme?: SchemeKey;
	/** Which scheme `index` currently refers to (internal cursor state). */
	activeScheme?: SchemeKey;
	/** Cursor within the active scheme's order; <0 means "not yet placed". */
	index?: number;
};

export type Direction = "next" | "prev"; // next = clockwise, prev = counter-clockwise

export type TileStep = {
	activeScheme: SchemeKey;
	index: number;
	cell: Cell;
	/** "i/N" readout for the touchscreen. */
	position: string;
};

/**
 * Advance the tiling cursor one detent.
 *
 * - If both directions share a scheme, CW and CCW are exact inverses
 *   (turning back retraces your steps).
 * - If the directions use different schemes, each direction is an independent
 *   forward cycler through its own scheme (turning the other way switches to
 *   the other arrangement, starting from its first cell).
 */
export function nextTile(settings: TileSettings, direction: Direction): TileStep {
	const cw = resolveScheme(settings.cwScheme);
	const ccw = resolveScheme(settings.ccwScheme);
	const target = direction === "next" ? cw : ccw;
	const order = cells(SCHEMES[target]);
	const n = order.length;
	const same = cw === ccw;
	const idx = settings.index ?? -1;
	const entering = settings.activeScheme !== target || idx < 0;

	let newIndex: number;
	if (same) {
		if (entering) {
			newIndex = direction === "next" ? 0 : n - 1;
		} else {
			newIndex = direction === "next" ? (idx + 1) % n : (idx - 1 + n) % n;
		}
	} else {
		// Different schemes: each direction advances forward in its own scheme.
		newIndex = entering ? 0 : (idx + 1) % n;
	}

	return {
		activeScheme: target,
		index: newIndex,
		cell: order[newIndex],
		position: `${newIndex + 1}/${n}`,
	};
}
