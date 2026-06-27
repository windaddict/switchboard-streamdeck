/** Small shared SVG helpers used by the key/touchscreen image builders. */

/** Encode an SVG string as a data URI usable by Stream Deck setImage / pixmaps. */
export function svgToDataUri(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** Round to one decimal place — keeps generated SVG coordinates compact. */
export function round(n: number): number {
	return Math.round(n * 10) / 10;
}
