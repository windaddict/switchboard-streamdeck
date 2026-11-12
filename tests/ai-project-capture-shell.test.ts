/**
 * Shell-harness test for AI Project's hold-to-capture: every refused capture
 * flashes the key AND logs one line saying why. A refusal that only flashed
 * left the operator with no way to learn that, say, a failed Codex probe was
 * blocking every capture.
 *
 * It EXECUTES the real action class. The SDK, the agent scan and the terminal
 * runners are scripted fakes; the test observes the logger and the alert.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
	log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn() },
	scan: undefined as unknown,
	front: "com.googlecode.iterm2",
	focusedTty: "/dev/ttys009",
}));

vi.mock("@elgato/streamdeck", () => ({
	default: { logger: h.log, ui: { current: undefined } },
	action: () => (target: unknown) => target,
	SingletonAction: class {},
}));
vi.mock("../src/mac/agent-scan.js", async (importOriginal) => ({
	...(await importOriginal<object>()),
	scanAgents: vi.fn(async () => h.scan),
}));
vi.mock("../src/mac/tmux-runner.js", () => ({
	findTmuxPath: () => "/opt/homebrew/bin/tmux",
	LIST_CLIENTS_ARGS: ["list-clients"],
	runTmux: vi.fn(async () => ({ ok: true, stdout: "", stderr: "" })),
}));
vi.mock("../src/applescript/runner.js", () => ({
	runAppleScript: vi.fn(async () => ({ ok: true, stdout: h.focusedTty, stderr: "" })),
	runJxa: vi.fn(async () => ({ ok: true, stdout: h.front, stderr: "" })),
}));

const { AiProject } = await import("../src/actions/ai-project.js");

const scan = (over: Record<string, unknown> = {}) => ({
	status: "ok",
	failedKinds: [],
	instances: [],
	claudeAgents: { source: "ok", reason: "" },
	...over,
});

const fakeKey = () => ({
	id: "k1",
	showAlert: vi.fn(async () => {}),
	showOk: vi.fn(async () => {}),
	getSettings: vi.fn(async () => ({})),
	setSettings: vi.fn(async () => {}),
});

const capture = (key: ReturnType<typeof fakeKey>) =>
	(new AiProject() as unknown as { capture(k: unknown): Promise<void> }).capture(key);

beforeEach(() => {
	vi.clearAllMocks();
	h.front = "com.googlecode.iterm2";
	h.focusedTty = "/dev/ttys009";
});

describe("AI Project capture refusals", () => {
	it("every kind whose scan failed is named in the log", async () => {
		// Two kinds, so a message naming only the first (or a fixed one) fails.
		h.scan = scan({ status: "unknown", failedKinds: ["codex", "cursor"] });
		const key = fakeKey();
		await capture(key);
		expect(key.showAlert).toHaveBeenCalledTimes(1);
		expect(h.log.warn.mock.calls, "ai-project capture: failed scan is logged").toEqual([
			["AI Project: refusing capture — the codex, cursor scan did not answer."],
		]);
		expect(key.setSettings).not.toHaveBeenCalled();
	});

	it("no focused terminal is logged", async () => {
		h.scan = scan();
		h.front = "com.apple.finder";
		const key = fakeKey();
		await capture(key);
		expect(key.showAlert).toHaveBeenCalledTimes(1);
		expect(h.log.warn.mock.calls, "ai-project capture: no focused terminal is logged").toEqual([
			["AI Project: refusing capture — no focused iTerm2 or Terminal session (frontmost: com.apple.finder)."],
		]);
	});

	it("no agent in the focused terminal is logged", async () => {
		h.scan = scan();
		const key = fakeKey();
		await capture(key);
		expect(key.showAlert).toHaveBeenCalledTimes(1);
		expect(h.log.warn.mock.calls, "ai-project capture: no agent found is logged").toEqual([
			["AI Project: refusing capture — no agent found in the focused terminal."],
		]);
		expect(key.setSettings).not.toHaveBeenCalled();
	});
});
