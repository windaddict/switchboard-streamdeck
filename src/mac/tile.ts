/**
 * Pure geometry + ordering for the "Arrange Window" dial. The dial walks the
 * frontmost window through the cells of a grid; a touch-tap toggles between
 * the button's two configured arrangements (e.g. columns ↔ grid), and rotation
 * steps the ACTIVE arrangement forward (clockwise) or backward — so reversing
 * the dial retraces the same style. All arrangements reduce to a (cols × rows)
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
/** Default for the second arrangement — a columns style, so the out-of-the-box
 * tap toggle is meaningfully "grid ↔ columns" rather than a no-op. */
export const ALT_DEFAULT_SCHEME: SchemeKey = "halvesH";

export function isSchemeKey(s: string | undefined): s is SchemeKey {
	return s !== undefined && Object.prototype.hasOwnProperty.call(SCHEMES, s);
}

function resolveScheme(s: SchemeKey | undefined): SchemeKey {
	return isSchemeKey(s) ? s : DEFAULT_SCHEME;
}

/** The button's two configured arrangements (settings keys kept from the old
 * per-direction model, so existing buttons keep their chosen pair). */
export function tileSchemes(settings: TileSettings): { a: SchemeKey; b: SchemeKey } {
	return {
		a: resolveScheme(settings.cwScheme),
		b: isSchemeKey(settings.ccwScheme) ? settings.ccwScheme : ALT_DEFAULT_SCHEME,
	};
}

/** The arrangement rotation currently walks (defaults to arrangement A). */
export function activeTileScheme(settings: TileSettings): SchemeKey {
	return isSchemeKey(settings.activeScheme) ? settings.activeScheme : tileSchemes(settings).a;
}

/** The arrangement a touch-tap switches to: A ↔ B. */
export function toggledTileScheme(settings: TileSettings): SchemeKey {
	const { a, b } = tileSchemes(settings);
	return activeTileScheme(settings) === a ? b : a;
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
	/** Arrangement A (historical key: was the clockwise-turn scheme). */
	cwScheme?: SchemeKey;
	/** Arrangement B — what a touch-tap toggles to (historical key). */
	ccwScheme?: SchemeKey;
	/** Flip the dial direction (for hardware that reports rotation inverted). */
	invertDial?: boolean;
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
 * Advance the tiling cursor one detent so the window follows the dial.
 *
 * Both directions walk the ACTIVE arrangement (tap toggles which one that is):
 * clockwise (`next`) steps FORWARD through its order (thirds: left → middle →
 * right; quarters: TL → TR → BR → BL), counter-clockwise (`prev`) steps in
 * REVERSE — so reversing the dial retraces the same style. A fresh clockwise
 * turn enters at the first cell, a fresh counter-clockwise turn at the last.
 * The caller maps physical rotation to direction (and may invert it for
 * hardware that reports rotation the other way).
 */
export function nextTile(settings: TileSettings, direction: Direction): TileStep {
	const scheme = activeTileScheme(settings);
	const order = cells(SCHEMES[scheme]);
	const n = order.length;
	const idx = settings.index ?? -1;
	const entering = settings.activeScheme !== scheme || idx < 0;

	const newIndex =
		direction === "next"
			? entering
				? 0
				: (idx + 1) % n
			: entering
				? n - 1
				: (idx - 1 + n) % n;

	return {
		activeScheme: scheme,
		index: newIndex,
		cell: order[newIndex],
		position: `${newIndex + 1}/${n}`,
	};
}
