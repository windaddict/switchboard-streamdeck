import { describe, it, expect } from "vitest";
import { svgToDataUri, round } from "../src/mac/svg.js";

describe("svgToDataUri", () => {
	it("round-trips an svg as a base64 data uri", () => {
		const uri = svgToDataUri("<svg/>");
		expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
		const b64 = uri.slice("data:image/svg+xml;base64,".length);
		expect(Buffer.from(b64, "base64").toString("utf8")).toBe("<svg/>");
	});
});

describe("round", () => {
	it("rounds to one decimal place", () => {
		expect(round(1.23)).toBe(1.2);
		expect(round(60)).toBe(60);
	});
});
