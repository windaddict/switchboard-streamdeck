import { describe, it, expect } from "vitest";
import { buildOpenFileImage, svgToDataUri } from "../src/mac/key-image.js";

describe("buildOpenFileImage", () => {
	it("match shows a green check badge", () => {
		const svg = buildOpenFileImage("match");
		expect(svg).toContain("#2ecc71");
		expect(svg).toContain("<circle");
		expect(svg).not.toContain("#e74c3c");
	});
	it("none shows a red X badge", () => {
		const svg = buildOpenFileImage("none");
		expect(svg).toContain("#e74c3c");
		expect(svg).toContain("<circle");
	});
	it("plain has no badge circle", () => {
		const svg = buildOpenFileImage("plain");
		expect(svg).not.toContain("<circle");
		expect(svg).toContain('width="72" height="72"');
	});
});

describe("svgToDataUri", () => {
	it("round-trips an svg as a base64 data uri", () => {
		const uri = svgToDataUri("<svg/>");
		expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
		const b64 = uri.slice("data:image/svg+xml;base64,".length);
		expect(Buffer.from(b64, "base64").toString("utf8")).toBe("<svg/>");
	});
});
