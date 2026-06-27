/**
 * Builds the Open File key image as an SVG: a document glyph with an optional
 * status badge — a green check when a matching file exists, a red X when none
 * does. Pure and unit-testable; the action turns it into a data URI for
 * setImage.
 */

export type FileStatus = "match" | "none" | "plain";

/** Encode an SVG string as a data URI usable by Stream Deck setImage. */
export function svgToDataUri(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function badge(status: FileStatus): string {
	if (status === "match") {
		return (
			`<circle cx="53" cy="53" r="14" fill="#2ecc71" stroke="#1d1d1f" stroke-width="2"/>` +
			`<path d="M46 53l5 5 9-10" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
		);
	}
	if (status === "none") {
		return (
			`<circle cx="53" cy="53" r="14" fill="#e74c3c" stroke="#1d1d1f" stroke-width="2"/>` +
			`<path d="M48 48l10 10M58 48l-10 10" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`
		);
	}
	return "";
}

/** Build the 72×72 Open File key image SVG for the given status. */
export function buildOpenFileImage(status: FileStatus): string {
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" fill="#1d1d1f"/>` +
		`<rect x="16" y="12" width="32" height="42" rx="4" fill="#2b2b2e" stroke="#8ab4ff" stroke-width="2"/>` +
		`<path d="M22 22h20M22 29h20M22 36h13" stroke="#8ab4ff" stroke-width="2.5" stroke-linecap="round"/>` +
		badge(status) +
		`</svg>`
	);
}
