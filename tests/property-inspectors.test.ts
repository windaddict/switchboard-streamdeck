/**
 * Configuration tests for the property-inspector (settings) pages.
 *
 * Every page loads the sdpi-components UI library. Loading it from
 * sdpi-components.dev means a settings screen is blank offline and depends on a
 * third party staying up, so the library ships inside the plugin at
 * `ui/lib/sdpi-components.js` (MIT, with its notices in
 * `ui/lib/THIRD-PARTY-LICENSES.md`). These are SOURCE assertions on purpose:
 * Stream Deck's embedded browser loads these files directly and there is no
 * executable surface to drive here, so the tests are non-authoritative about
 * how a page renders (rendering offline is the operator acceptance check `sdpi-bundle-live`, outside this suite). They follow the
 * manifest to the pages it names, so a dangling path or an orphan page fails.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PLUGIN = new URL("../com.movingavg.switchboard.sdPlugin/", import.meta.url);

type Action = { Name: string; PropertyInspectorPath?: string };
const manifest = JSON.parse(readFileSync(new URL("manifest.json", PLUGIN), "utf8")) as { Actions: Action[] };

const pages = manifest.Actions.flatMap((a) =>
	a.PropertyInspectorPath === undefined ? [] : [{ name: a.Name, path: a.PropertyInspectorPath }],
);
const onDisk = readdirSync(new URL("ui/", PLUGIN))
	.filter((f) => f.endsWith(".html"))
	.map((f) => `ui/${f}`)
	.sort();

describe("property inspector pages", () => {
	it("every action's PropertyInspectorPath names an existing ui page, and every ui page is named", () => {
		// Passing on its own today would make this a pure guard; it is anchored to the
		// bundled-library requirement so it is part of the red set.
		for (const p of pages) {
			expect(existsSync(new URL(p.path, PLUGIN)), `${p.name} PropertyInspectorPath must name an existing ui page`).toBe(true);
			expect(onDisk, `${p.name} PropertyInspectorPath must be one of the ui/*.html pages`).toContain(p.path);
		}
		expect([...new Set(pages.map((p) => p.path))].sort(), "manifest PI paths must cover every ui/*.html page").toEqual(onDisk);
		expect(pages.length, "manifest must name sixteen property inspectors").toBe(16);
		expect(
			existsSync(new URL("ui/lib/sdpi-components.js", PLUGIN)),
			"the bundled library every page loads must exist",
		).toBe(true);
	});

	for (const p of pages) {
		const file = p.path.split("/").pop() ?? p.path;
		it(`${file} must load the bundled lib/sdpi-components.js`, () => {
			const html = readFileSync(new URL(p.path, PLUGIN), "utf8");
			expect(html, `${file} must load the bundled lib/sdpi-components.js`).toContain(
				'<script src="lib/sdpi-components.js"></script>',
			);
			expect(html, `${file} must not load sdpi-components from the network`).not.toContain("sdpi-components.dev");
		});
	}
});

describe("bundled third-party files", () => {
	it("ui/lib/sdpi-components.js must be bundled", () => {
		const path = new URL("ui/lib/sdpi-components.js", PLUGIN);
		expect(existsSync(path), "ui/lib/sdpi-components.js must be bundled").toBe(true);
		const head = readFileSync(path, "utf8").slice(0, 300);
		expect(head, "bundled library must be sdpi-components v4").toContain("sdpi-components v4");
		expect(head, "bundled library must keep its licence banner").toContain("@license");
	});

	it("ui/lib/THIRD-PARTY-LICENSES.md must ship", () => {
		const path = new URL("ui/lib/THIRD-PARTY-LICENSES.md", PLUGIN);
		expect(existsSync(path), "ui/lib/THIRD-PARTY-LICENSES.md must ship").toBe(true);
		const text = readFileSync(path, "utf8");
		expect(text, "licence file must carry the MIT text").toContain("MIT License");
		expect(text, "licence file must credit Corsair Memory").toContain("Corsair Memory");
		expect(text, "licence file must carry the BSD 3-Clause text").toContain("BSD 3-Clause");
		expect(text, "licence file must credit Google LLC").toContain("Google LLC");
	});
});
