/**
 * WHAT IT'S FOR: proves the plugin entry point and the manifest list the same
 * actions, in both directions. The SDK only checks one direction at runtime:
 * `registerAction` throws for a class whose UUID the manifest lacks, and only
 * on the live deck. Nothing notices a manifest action with no class behind it,
 * which is what a half-done retirement (manifest entry left, class deleted)
 * would ship: a key in the action list that never responds.
 *
 * It executes the real `src/plugin.ts` and every action module it imports.
 * The SDK itself cannot be loaded here: its module reads `manifest.json` from
 * the working directory at import time, which only exists inside Stream Deck.
 * So `action` is a stand-in that does what the SDK's does (SDK 1.4.1,
 * `dist/index.js` `function action`): subclass the target with a
 * `manifestId` field set from the decorator's `UUID`. The UUIDs compared below
 * are therefore the ones each shipped class passes to `@action`; what this
 * does NOT execute is the SDK's own decorator. The two modules `plugin.ts`
 * calls at import time that would otherwise spawn `osascript` are stubbed too.
 */

import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";

const { registered } = vi.hoisted(() => ({ registered: [] as string[] }));

vi.mock("@elgato/streamdeck", () => {
	const logger: Record<string, unknown> = {
		setLevel: vi.fn(),
		trace: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
	logger.createScope = () => logger;
	return {
		default: {
			logger,
			actions: { registerAction: (a: { manifestId?: string }) => registered.push(String(a.manifestId)) },
			connect: vi.fn(),
		},
		LogLevel: { INFO: "info" },
		SingletonAction: class {},
		action:
			(definition: { UUID: string }) =>
			<T extends new (...args: never[]) => object>(target: T) =>
				class extends target {
					manifestId = definition.UUID;
				},
	};
});
vi.mock("../src/applescript/runner.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/applescript/runner.js")>()),
	runJxaWithArgs: vi.fn(async () => ({ ok: true, stdout: "", stderr: "" })),
}));
vi.mock("../src/mac/pasteboard-stash.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/mac/pasteboard-stash.js")>()),
	releaseStash: vi.fn(async () => undefined),
}));

const manifest = JSON.parse(
	readFileSync(new URL("../com.movingavg.switchboard.sdPlugin/manifest.json", import.meta.url), "utf8"),
) as { Actions: Array<{ UUID: string }> };

it("plugin.ts registers exactly one class per manifest action, and no other", async () => {
	await import("../src/plugin.js");
	expect(registered.length, "plugin.ts must register at least one action").toBeGreaterThan(0);
	expect([...registered].sort(), "registered action UUIDs must equal the manifest's action UUIDs").toEqual(
		manifest.Actions.map((a) => a.UUID).sort(),
	);
});
