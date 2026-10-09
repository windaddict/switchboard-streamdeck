/**
 * Elgato's white-only rule applies to the action-LIST icons and the category
 * icon, never to key faces: a key face is drawn on the deck and keeps its
 * family colour (phosphor = tmux, azure = windows/apps/web, amber = BBEdit,
 * teal = files, plus one colour per agent). This asset test decodes each real
 * `key.png` and requires its family colour to be present, so the white-only
 * rule cannot leak into key faces.
 *
 * The ink ground (#0F1211) fills most of every key and can never satisfy the
 * check. The family colour is counted on GLYPH pixels (rows above the jack-line
 * strip at the key's foot, y >= 60), so a face whose glyph went white but whose
 * strip kept the colour still fails. The AI Project glyph is drawn in the three
 * agent colours rather than its own family colour (#7FD4C1), so for that one key
 * the strip is the only carrier and the whole image is counted.
 *
 * One looping `it` in the generator's ACTIONS order. It pins behaviour that
 * already holds; its proof is a mutation (whiten one glyph, see the plan).
 */

import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

import { readPng } from "./helpers/png.js";

const PLUGIN = new URL("../com.movingavg.switchboard.sdPlugin/", import.meta.url);

const PHOSPHOR = "#3ECF6E";
const AZURE = "#4E9CFF";
const AMBER = "#F0A63C";
const TEAL = "#3EC9C4";
const CORAL = "#D97757";
const VIOLET = "#A78BFA";
const STEEL = "#B9C6D4";
const SIGNAL_AI = "#7FD4C1";

/** slug -> family colour, in `scripts/make-icons.py` ACTIONS order. */
const FAMILY: Array<[string, string]> = [
	["aiproject", SIGNAL_AI],
	["claudeproject", CORAL],
	["codexproject", VIOLET],
	["cursorproject", STEEL],
	["tmux", PHOSPHOR],
	["tmuxpane", PHOSPHOR],
	["tmuxwindial", PHOSPHOR],
	["switchapp", AZURE],
	["appwindows", AZURE],
	["windowring", AZURE],
	["scroll", AZURE],
	["tile", AZURE],
	["jump", AZURE],
	["bbeditdoc", AMBER],
	["openfile", TEAL],
	["snippet", TEAL],
];

const MIN_FAMILY_PIXELS = 20;
const MAX_DISTANCE = 40;
const JACK_LINE_TOP = 60;

function rgb(hex: string): [number, number, number] {
	return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

it("every key face keeps its family colour and its opaque ink ground", () => {
	const manifest = JSON.parse(readFileSync(new URL("manifest.json", PLUGIN), "utf8")) as {
		Actions: Array<{ Icon: string }>;
	};
	const declared = manifest.Actions.map((a) => a.Icon.split("/").slice(-2, -1)[0]).sort();
	expect(
		FAMILY.map(([slug]) => slug).sort(),
		"key-face table must cover exactly the manifest's actions",
	).toEqual(declared);

	for (const [slug, hex] of FAMILY) {
		const png = readPng(new URL(`imgs/actions/${slug}/key.png`, PLUGIN));
		expect([png.width, png.height], `key face ${slug}/key.png dimensions`).toEqual([72, 72]);

		let translucent = 0;
		let familyPixels = 0;
		const [fr, fg, fb] = rgb(hex);
		for (let y = 0; y < png.height; y++) {
			for (let x = 0; x < png.width; x++) {
				const i = (y * png.width + x) * 4;
				if (png.rgba[i + 3] < 255) translucent++;
				if (slug !== "aiproject" && y >= JACK_LINE_TOP) continue;
				const d = Math.hypot(png.rgba[i] - fr, png.rgba[i + 1] - fg, png.rgba[i + 2] - fb);
				if (d <= MAX_DISTANCE) familyPixels++;
			}
		}
		expect(translucent, `key face ${slug}/key.png must be fully opaque (ink ground)`).toBe(0);
		expect(
			familyPixels >= MIN_FAMILY_PIXELS,
			`key face ${slug}/key.png must keep its family colour`,
		).toBe(true);
	}
});
