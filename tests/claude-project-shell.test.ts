/**
 * Shell-harness test for the legacy Claude Project key: a deck carrying only
 * this key must still log losing `claude agents --json`, once per transition.
 *
 * It EXECUTES the real action class and the real log helper. The SDK, the scan
 * and the terminal runners are scripted fakes, so the test observes the logger
 * a user can read, not the source text of the call.
 */

import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
	log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn() },
	scans: [] as unknown[],
}));

vi.mock("@elgato/streamdeck", () => ({
	default: { logger: h.log, ui: { current: undefined } },
	action: () => (target: unknown) => target,
	SingletonAction: class {},
}));
vi.mock("../src/mac/claude-scan.js", () => ({
	processRunning: vi.fn(async () => false),
	scanClaudeSnapshot: vi.fn(async () => h.scans.shift()),
}));
vi.mock("../src/mac/tmux-runner.js", () => ({
	findTmuxPath: () => "/opt/homebrew/bin/tmux",
	LIST_CLIENTS_ARGS: ["list-clients"],
	runTmux: vi.fn(async () => ({ ok: true, stdout: "", stderr: "" })),
}));
vi.mock("../src/applescript/runner.js", () => ({
	runAppleScript: vi.fn(async () => ({ ok: true, stdout: "", stderr: "" })),
	runJxa: vi.fn(async () => ({ ok: true, stdout: "com.example.other", stderr: "" })),
}));

const { ClaudeProject } = await import("../src/actions/claude-project.js");

const snap = (source: string, reason = "") => ({ status: "ok", instances: [], claudeAgents: { source, reason } });

describe("Claude Project (legacy) shell", () => {
	it("logs losing and regaining claude agents --json once each, from this key alone", async () => {
		h.scans.push(snap("unavailable", "no claude binary"), snap("unavailable", "no claude binary"), snap("ok"));
		const key = new ClaudeProject() as unknown as { snapshot(): Promise<unknown> };
		await key.snapshot();
		await key.snapshot();
		expect(h.log.warn.mock.calls, "legacy key: source loss is logged").toEqual([
			["Claude state: claude agents --json unavailable (no claude binary); falling back to title/transcript signals"],
		]);
		await key.snapshot();
		expect(h.log.info.mock.calls).toEqual([["Claude state: claude agents --json available again"]]);
		expect(h.log.warn).toHaveBeenCalledTimes(1);
	});
});
