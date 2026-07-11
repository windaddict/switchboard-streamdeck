/** Small shared SVG helpers used by the key/touchscreen image builders. */

/** Encode an SVG string as a data URI usable by Stream Deck setImage / pixmaps. */
export function svgToDataUri(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** Round to one decimal place — keeps generated SVG coordinates compact. */
export function round(n: number): number {
	return Math.round(n * 10) / 10;
}

/**
 * Convert HSL (h 0–360, s/l 0–100) to a #rrggbb hex string. Key-face SVGs must
 * not use `hsl()` literals: Stream Deck's KEY rasterizer silently paints them
 * as black (the touchscreen pipeline accepts them; keys do not).
 */
export function hslToHex(h: number, s: number, l: number): string {
	const sn = s / 100;
	const ln = l / 100;
	const a = sn * Math.min(ln, 1 - ln);
	const channel = (n: number): string => {
		const k = (n + h / 30) % 12;
		const c = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
		return Math.round(255 * c)
			.toString(16)
			.padStart(2, "0");
	};
	return `#${channel(0)}${channel(8)}${channel(4)}`;
}
