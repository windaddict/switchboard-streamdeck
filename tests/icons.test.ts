/**
 * Elgato's plugin guidelines require the action-LIST icons and the category icon
 * to be white (#FFFFFF), monochrome, on a transparent ground. Key faces (the
 * images drawn on the deck) keep their colour. This file decodes the real PNGs
 * the generator (`scripts/make-icons.py`) shipped, so it crosses the
 * generator -> PNG -> manifest boundary: it follows `manifest.json` to every
 * icon the plugin actually declares instead of a hard-coded slug list, so a
 * newly added action cannot ship a coloured list icon unnoticed.
 *
 * Pixel regions (REGIONS below): four glyphs (tmux, switchapp, appwindows,
 * windowring) cannot be converted by a plain colour swap, because they relied on
 * INK knock-outs or a coloured fill under a light mark. Their white-only
 * variants are checked by NAMED rectangles that must hold white ink (positive)
 * or stay transparent (negative). This pins those named features, not the
 * whole shape: a glyph wrong outside every rectangle can still pass.
 * At 20 px a 3-unit stroke on the 72 grid is under one pixel wide, so no pixel reaches alpha 255 (measured 2026-10-05: tmux, switchapp, appwindows and windowring icon.png have none). "White" therefore means EVERY pixel in the rectangle has alpha >= WHITE_ALPHA and RGB exactly 255; "transparent" means EVERY pixel has alpha 0. Rectangles are inclusive pixel boxes on the 20 px icon.png, inset so anti-aliased fringes stay out. checkIcon also requires a minimum count of visible white pixels, so an empty PNG fails every icon, not only the four with regions.
 */

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { type Png, readPng } from "./helpers/png.js";

const PLUGIN = new URL("../com.movingavg.switchboard.sdPlugin/", import.meta.url);

type ManifestAction = { UUID: string; Name: string; Icon: string };
type Manifest = { Actions: ManifestAction[]; CategoryIcon: string };
const manifest = JSON.parse(readFileSync(new URL("manifest.json", PLUGIN), "utf8")) as Manifest;

const EXPECTED_ACTION_COUNT = 16;
const WHITE_ALPHA = 64;
const CLEAR_ALPHA = 0;
// Measured 2026-10-05: the sparsest list icon (openfile/icon.png) has 58 of 400 pixels at alpha >= 64; 5% is 20.
const MIN_GLYPH_FRACTION = 0.05;

function slugOf(a: ManifestAction): string {
	// "imgs/actions/<slug>/icon" -> "<slug>"
	return a.Icon.split("/").slice(-2, -1)[0] ?? a.Icon;
}

function isWhite(png: Png, i: number): boolean {
	return png.rgba[i] === 255 && png.rgba[i + 1] === 255 && png.rgba[i + 2] === 255;
}

function stats(png: Png) {
	let transparent = 0;
	let nonWhiteVisible = 0;
	let visibleWhite = 0;
	for (let i = 0; i < png.width * png.height * 4; i += 4) {
		const a = png.rgba[i + 3];
		if (a === 0) transparent++;
		else if (!isWhite(png, i)) nonWhiteVisible++;
		if (a >= WHITE_ALPHA && isWhite(png, i)) visibleWhite++;
	}
	return { transparent, nonWhiteVisible, visibleWhite, total: png.width * png.height };
}

/** Shared checks: the manifest names the file, it has the right size and a
 * transparent ground, and then (the assertion that fails on coloured art) every
 * visible pixel is exactly white. `title` is "list icon <slug>/icon.png" or
 * "category icon category-icon.png"; it prefixes every assertion message. */
function checkIcon(title: string, path: string, size: number): Png {
	expect(manifest.Actions.length, "manifest must declare 16 actions").toBe(EXPECTED_ACTION_COUNT);
	expect(existsSync(new URL(path, PLUGIN)), `${title} must exist (the manifest names ${path})`).toBe(true);
	const png = readPng(new URL(path, PLUGIN));
	expect([png.width, png.height], `${title} dimensions`).toEqual([size, size]);
	const s = stats(png);
	expect(s.transparent > 0, `${title} must have a transparent background`).toBe(true);
	expect(png.rgba[3], `${title} corner pixel must be transparent`).toBe(0);
	expect(s.nonWhiteVisible, `${title}: every visible pixel must be #FFFFFF`).toBe(0);
	expect(
		s.visibleWhite >= Math.ceil(s.total * MIN_GLYPH_FRACTION),
		`${title} must draw a visible white glyph (at least 5% of pixels at alpha >= ${WHITE_ALPHA})`,
	).toBe(true);
	return png;
}

describe("list icons are white on transparent", () => {
	for (const a of manifest.Actions) {
		const slug = slugOf(a);
		for (const [suffix, size] of [["", 20], ["@2x", 40]] as const) {
			const file = `icon${suffix}.png`;
			it(`${slug}/${file}`, () => {
				checkIcon(`list icon ${slug}/${file}`, `${a.Icon}${suffix}.png`, size);
			});
		}
	}
});

describe("category icon is a white mark with no tile", () => {
	for (const [suffix, size] of [["", 28], ["@2x", 56]] as const) {
		const name = `category-icon${suffix}.png`;
		it(name, () => {
			const png = checkIcon(`category icon ${name}`, `${manifest.CategoryIcon}${suffix}.png`, size);
			// No solid tile: most of the canvas must be see-through.
			const s = stats(png);
			expect(s.transparent / s.total >= 0.5, `category icon ${name} must not be a solid tile`).toBe(true);
		});
	}
});

type Region = { name: string; kind: "white" | "transparent"; x0: number; y0: number; x1: number; y1: number };

/**
 * Geometry contract for the four explicit monochrome variants, in inclusive
 * pixel coordinates on the 20 px icon.png (72-grid x * 20/72). The glyph
 * features each rectangle pins are named in the comments.
 */
const REGIONS: Record<string, Region[]> = {
	// Window outline top edge; the lit status bar is an OUTLINE with a solid
	// cursor block inside it, so the interior beside the cursor is clear.
	tmux: [
		{ name: "window outline", kind: "white", x0: 6, y0: 3, x1: 12, y1: 3 },
		{ name: "cursor block", kind: "white", x0: 13, y0: 11, x1: 13, y1: 11 },
		{ name: "status bar interior beside the cursor", kind: "transparent", x0: 7, y0: 11, x1: 10, y1: 11 },
	],
	// Front window is an outline (no AZURE fill) with the arrow inside it, and
	// the back window's strokes are hidden where the front window covers them.
	switchapp: [
		{ name: "arrow", kind: "white", x0: 11, y0: 10, x1: 13, y1: 10 },
		{ name: "front window interior", kind: "transparent", x0: 15, y0: 9, x1: 15, y1: 11 },
		{ name: "back window edge hidden behind the front window", kind: "transparent", x0: 10, y0: 8, x1: 11, y1: 9 },
	],
	// Cascade of outlines; occlusion is done by clipping the back strokes.
	appwindows: [
		{ name: "front window outline", kind: "white", x0: 9, y0: 14, x1: 13, y1: 14 },
		{ name: "middle window outline", kind: "white", x0: 7, y0: 5, x1: 11, y1: 5 },
		{ name: "back window outline", kind: "white", x0: 5, y0: 2, x1: 10, y1: 2 },
		{ name: "front interior hides the middle right edge", kind: "transparent", x0: 9, y0: 9, x1: 14, y1: 10 },
		{ name: "front interior hides the middle bottom edge", kind: "transparent", x0: 9, y0: 11, x1: 13, y1: 12 },
		{ name: "middle interior hides the back right edge", kind: "transparent", x0: 9, y0: 6, x1: 12, y1: 6 },
	],
	// Ring boxes are outlines; the ring is clipped out of their interiors.
	windowring: [
		{ name: "top box outline", kind: "white", x0: 8, y0: 2, x1: 11, y1: 2 },
		{ name: "left box outline", kind: "white", x0: 4, y0: 13, x1: 5, y1: 13 },
		{ name: "right box outline", kind: "white", x0: 14, y0: 13, x1: 15, y1: 13 },
		{ name: "left box interior hides the ring", kind: "transparent", x0: 4, y0: 11, x1: 5, y1: 12 },
		{ name: "right box interior hides the ring", kind: "transparent", x0: 14, y0: 11, x1: 15, y1: 12 },
	],
};

describe("explicit monochrome variants keep their features", () => {
	for (const [slug, regions] of Object.entries(REGIONS)) {
		for (const r of regions) {
			it(`${slug} icon.png ${r.name} must be ${r.kind}`, () => {
				const action = manifest.Actions.find((a) => slugOf(a) === slug);
				expect(action, `manifest must declare the ${slug} action`).toBeDefined();
				const png = readPng(new URL(`${action?.Icon}.png`, PLUGIN));
				let allWhite = true;
				let maxAlpha = 0;
				for (let y = r.y0; y <= r.y1; y++) {
					for (let x = r.x0; x <= r.x1; x++) {
						const i = (y * png.width + x) * 4;
						const a = png.rgba[i + 3];
						maxAlpha = Math.max(maxAlpha, a);
						if (!(a >= WHITE_ALPHA && isWhite(png, i))) allWhite = false;
					}
				}
				const label = `list icon ${slug}/icon.png: ${r.name} must be ${r.kind}`;
				if (r.kind === "white") expect(allWhite, label).toBe(true);
				else expect(maxAlpha, label).toBe(CLEAR_ALPHA);
			});
		}
	}
});
