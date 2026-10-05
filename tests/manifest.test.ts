/**
 * Configuration tests for the shipped manifest, package.json and Homebrew cask.
 *
 * These are SOURCE assertions on purpose: Stream Deck reads `manifest.json`
 * directly and there is no executable surface to run, so reading the file is
 * the only way to observe what it will be told. They are therefore
 * non-authoritative about runtime behaviour (runtime behaviour is the operator acceptance checks `node-24-live` and `multi-action-live`, outside this suite)
 * but they do pin every value a regression could silently flip: the Node
 * runtime, the shipped debug flag, the minimum Stream Deck version Node 24
 * forces, the description users read in the app, and which actions may be
 * multi-action steps.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

type Action = { UUID: string; Name: string; SupportedInMultiActions?: boolean };
type Manifest = {
	Description: string;
	Nodejs: { Version?: string; Debug?: string };
	Software: { MinimumVersion: string };
	Actions: Action[];
};

const manifest = JSON.parse(read("com.movingavg.switchboard.sdPlugin/manifest.json")) as Manifest;
const pkg = JSON.parse(read("package.json")) as { description: string };
const cask = read("packaging/homebrew/switchboard.rb");

describe("manifest runtime", () => {
	it("Nodejs.Version must be 24", () => {
		expect(manifest.Nodejs.Version, "Nodejs.Version must be 24").toBe("24");
	});

	it("Nodejs.Debug must not ship", () => {
		expect(manifest.Nodejs.Debug, "Nodejs.Debug must not ship").toBeUndefined();
		// Debug launches the plugin with --inspect; the whole Nodejs block must carry only the version.
		expect(Object.keys(manifest.Nodejs), "Nodejs block must hold only Version").toEqual(["Version"]);
	});

	it("Software.MinimumVersion must be 7.1 for Node 24", () => {
		// Elgato's schema pins Node "20" for every minimum below 7.1 (measured with `streamdeck validate`).
		expect(manifest.Software.MinimumVersion, "Software.MinimumVersion must be 7.1 for Node 24").toBe("7.1");
	});
});

describe("descriptions name all three agents", () => {
	it("manifest Description must name Cursor CLI", () => {
		expect(manifest.Description, "Description must name Cursor CLI").toContain("Cursor");
		expect(manifest.Description, "Description must still name Claude Code").toContain("Claude Code");
		expect(manifest.Description, "Description must still name Codex").toContain("Codex");
	});

	it("package.json description must name Cursor CLI", () => {
		expect(pkg.description, "package.json description must name Cursor CLI").toContain("Cursor");
		expect(pkg.description, "package.json description must drop the stale Safari-only text").not.toContain(
			"jump to (or open) a Safari tab",
		);
	});

	it("cask desc must name Cursor", () => {
		expect(cask, "cask desc must name Cursor").toMatch(/desc ".*Cursor/);
	});
});

/** Which actions may be steps of a Multi Action, and why (see the plan). */
const MULTI_ACTION: Record<string, boolean> = {
	jump: true,
	switchapp: true,
	tmux: true,
	openfile: true,
	snippet: true,
	// Encoders can never be steps; Window Ring is only ever configured by long-press;
	// the project keys' value is a live face a multi-action never draws.
	scroll: false,
	tile: false,
	tmuxpane: false,
	tmuxwindial: false,
	appwindows: false,
	bbeditdoc: false,
	windowring: false,
	aiproject: false,
	claudeproject: false,
	codexproject: false,
	cursorproject: false,
};

describe("SupportedInMultiActions is declared on every action", () => {
	for (const a of manifest.Actions) {
		const slug = a.UUID.split(".").pop() ?? a.UUID;
		const expected = MULTI_ACTION[slug];
		it(`${a.Name} SupportedInMultiActions must be declared ${String(expected)}`, () => {
			expect(expected, `${a.Name} must have an entry in the test's flag table`).toBeDefined();
			expect(a.SupportedInMultiActions, `${a.Name} SupportedInMultiActions must be declared ${String(expected)}`).toBe(
				expected,
			);
		});
	}

	it("the flag table covers exactly the manifest's sixteen actions", () => {
		const slugs = manifest.Actions.map((a) => a.UUID.split(".").pop()).sort();
		expect(slugs, "manifest must have an action per flag-table entry").toEqual(Object.keys(MULTI_ACTION).sort());
		expect(
			manifest.Actions.filter((a) => a.SupportedInMultiActions === true).length,
			"exactly five actions must be multi-action steps",
		).toBe(5);
	});
});
