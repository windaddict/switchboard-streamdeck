/**
 * Shell-harness test: a deck carrying only AI Project keys must still log
 * losing and regaining `claude agents --json`, once per transition. The
 * retired Claude Project key used to carry this test; with that key gone, AI
 * Project's poll is the call site that has to keep reporting.
 *
 * It EXECUTES the real action class's poll and the real log helper. The SDK,
 * the agent scan and the terminal runners are scripted fakes, so the test
 * observes the logger a user can read, not the source text of the call. The
 * test supplies the scan, not the call: deleting the poll's
 * `noteClaudeAgentsSource` call leaves the logger silent and fails it.
 *
 * Scope: it drives `doRefreshAll` directly with a key placed in the visible
 * map, so it does not cover the `onWillAppear` timer that schedules the poll
 * (a broken timer leaves every AI Project key unpainted, which the operator
 * sees at once). That the real scan forwards Claude's source status is
 * covered in `agent-scan.test.ts` (`claudeAgents` source ok / unavailable).
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
vi.mock("../src/mac/agent-scan.js", async (importOriginal) => ({
	...(await importOriginal<object>()),
	scanAgents: vi.fn(async () => h.scans.shift()),
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

const { AiProject } = await import("../src/actions/ai-project.js");

const scan = (source: string, reason = "") => ({
	status: "ok",
	failedKinds: [],
	instances: [],
	claudeAgents: { source, reason },
});

describe("AI Project shell: claude agents --json source log", () => {
	it("logs losing and regaining the source once each, from an AI Project key alone", async () => {
		// Starts from ok, so the test covers losing a source that WAS available,
		// not only starting up without one.
		h.scans.push(scan("ok"), scan("unavailable", "no claude binary"), scan("unavailable", "no claude binary"), scan("ok"));
		const action = new AiProject() as unknown as {
			visible: Map<string, unknown>;
			doRefreshAll(): Promise<void>;
		};
		action.visible.set("k1", {
			id: "k1",
			getSettings: vi.fn(async () => ({ agent: "claude", project: "/tmp/p" })),
			setImage: vi.fn(async () => {}),
		});

		await action.doRefreshAll();
		expect(h.log.warn, "nothing to report while the source is available").not.toHaveBeenCalled();
		await action.doRefreshAll();
		await action.doRefreshAll();
		expect(h.log.warn.mock.calls, "ai-project: source loss is logged once").toEqual([
			["Claude state: claude agents --json unavailable (no claude binary); falling back to title/transcript signals"],
		]);
		await action.doRefreshAll();
		expect(h.log.info.mock.calls, "ai-project: source recovery is logged once").toEqual([
			["Claude state: claude agents --json available again"],
		]);
		expect(h.log.warn).toHaveBeenCalledTimes(1);
		expect(h.scans, "every scripted scan must have been consumed").toEqual([]);
	});
});
