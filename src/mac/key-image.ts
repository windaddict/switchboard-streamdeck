/**
 * Builds the Open File key image as an SVG: a document glyph with an optional
 * status badge — a green check when a matching file exists, a red X when none
 * does. Pure and unit-testable; the action turns it into a data URI for
 * setImage.
 */

export type FileStatus = "match" | "none" | "plain";

// svgToDataUri now lives in the shared svg module; re-exported for callers.
export { svgToDataUri } from "./svg.js";

function badge(status: FileStatus): string {
	if (status === "match") {
		return (
			`<circle cx="52" cy="50" r="13" fill="#46C46E" stroke="#0F1211" stroke-width="2"/>` +
			`<path d="M46 50l4 4 8-9" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
		);
	}
	if (status === "none") {
		return (
			`<circle cx="52" cy="50" r="13" fill="#E5484D" stroke="#0F1211" stroke-width="2"/>` +
			`<path d="M47 45l10 10M57 45l-10 10" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`
		);
	}
	return "";
}

/**
 * Build the 72×72 Open File key image SVG for the given status, on the shared
 * design system (ink ground, teal files family, jack-line — matching the
 * action's static icon). Hex colours only: the key rasterizer paints hsl()
 * black.
 */
export function buildOpenFileImage(status: FileStatus): string {
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" fill="#0F1211"/>` +
		`<rect x="8" y="62.5" width="56" height="3.5" rx="1.75" fill="#3EC9C4" opacity="0.95"/>` +
		`<rect x="20" y="9" width="26" height="36" rx="3" fill="none" stroke="#3EC9C4" stroke-width="3"/>` +
		`<path d="M26 18h14M26 25h14M26 32h9" stroke="#3EC9C4" stroke-width="2.5" opacity="0.8" stroke-linecap="round"/>` +
		badge(status) +
		`</svg>`
	);
}
