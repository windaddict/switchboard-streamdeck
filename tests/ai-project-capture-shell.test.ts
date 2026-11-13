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
	clients: "",
	panes: "",
	panesOk: true,
	focusOk: true,
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
	runTmux: vi.fn(async (args: readonly string[]) =>
		args[0] === "list-clients" ? { ok: true, stdout: h.clients, stderr: "" }
			: args[0] === "list-panes" ? { ok: h.panesOk, stdout: h.panesOk ? h.panes : "", stderr: h.panesOk ? "" : "boom" }
				: { ok: true, stdout: "", stderr: "" }),
}));
vi.mock("../src/applescript/runner.js", () => ({
	runAppleScript: vi.fn(async () => (h.focusOk ? { ok: true, stdout: h.focusedTty, stderr: "" } : { ok: false, stdout: "", stderr: "-1743" })),
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
	h.clients = "";
	h.panes = "";
	h.panesOk = true;
	h.focusOk = true;
});

/** One `list-panes` line in LIST_AGENT_PANES_ARGS's format; active pane in the
 * active window. */
const paneLine = (tty: string, session: string) => [tty, session, "@1", "%1", "1", "1", "title"].join("\u001f") + "\n";

const agentOn = (tty: string, pid: number) => ({ kind: "codex", pid, tty, cwd: "/tmp/p", sessionId: `s${pid}` });

describe("AI Project capture refusals", () => {
	// Each case varies the input the message is built from, so a warning that
	// hard-codes one fixture's value fails the other case.
	it.each([
		[["codex", "cursor"], "codex, cursor"],
		[["claude"], "claude"],
	])("every kind whose scan failed is named in the log (%j)", async (failedKinds, named) => {
		h.scan = scan({ status: "unknown", failedKinds });
		const key = fakeKey();
		await capture(key);
		expect(key.showAlert).toHaveBeenCalledTimes(1);
		expect(h.log.warn.mock.calls, "ai-project capture: failed scan is logged").toEqual([
			[`AI Project: refusing capture — the ${named} scan did not answer.`],
		]);
		expect(key.setSettings).not.toHaveBeenCalled();
	});

	it.each(["com.apple.finder", "com.example.app"])("no focused terminal is logged (%s)", async (front) => {
		h.scan = scan();
		h.front = front;
		const key = fakeKey();
		await capture(key);
		expect(key.showAlert).toHaveBeenCalledTimes(1);
		expect(h.log.warn.mock.calls, "ai-project capture: no focused terminal is logged").toEqual([
			[`AI Project: refusing capture — no focused iTerm2 or Terminal session (frontmost: ${front}).`],
		]);
	});

	it("a frontmost bundle id carrying a newline cannot forge a second log line", async () => {
		h.scan = scan();
		h.front = "com.evil\nAI Project: forged";
		await capture(fakeKey());
		expect(h.log.warn.mock.calls).toHaveLength(1);
		expect(h.log.warn.mock.calls[0][0], "ai-project capture: bundle id is escaped").not.toContain("\n");
		expect(h.log.warn.mock.calls[0][0]).toContain("com.evil\\nAI Project: forged");
	});

	// The agent on ANOTHER tty matters: a warning gated on "no instances at
	// all" would pass the empty case and stay silent here.
	it.each([
		["no agent", () => [agentOn("/dev/ttys001", 1)], "", "no agent found in the focused terminal."],
		["two agents on one tty", () => [agentOn("/dev/ttys009", 1), agentOn("/dev/ttys009", 2)], "", "two or more agents share the focused terminal."],
		["a tmux client with no active pane", () => [agentOn("/dev/ttys009", 1)], "/dev/ttys009|main\n", "the focused tmux session has no active pane."],
	])("%s is logged with its own reason", async (_name, instances, clients, reason) => {
		h.scan = scan({ instances: instances() });
		h.clients = clients;
		const key = fakeKey();
		await capture(key);
		expect(key.showAlert).toHaveBeenCalledTimes(1);
		expect(h.log.warn.mock.calls, "ai-project capture: refusal names its reason").toEqual([
			[`AI Project: refusing capture — ${reason}`],
		]);
		expect(key.setSettings).not.toHaveBeenCalled();
	});

	it("a failed focused-tty AppleScript is logged as a failure, not as no session", async () => {
		h.scan = scan();
		h.focusOk = false;
		const key = fakeKey();
		await capture(key);
		expect(key.showAlert).toHaveBeenCalledTimes(1);
		expect(h.log.warn.mock.calls).toEqual([
			["AI Project: refusing capture — could not read the focused session's tty from com.googlecode.iterm2 (AppleScript failed)."],
		]);
	});

	it("a failed pane listing is logged as a failure, not as no active pane", async () => {
		h.scan = scan({ instances: [agentOn("/dev/ttys009", 1)] });
		h.clients = "/dev/ttys009|main\n";
		h.panesOk = false;
		await capture(fakeKey());
		expect(h.log.warn.mock.calls).toEqual([["AI Project: refusing capture — tmux listed its clients but not its panes."]]);
	});

	// The tmux branch translates the client's tty into the active pane's tty.
	// An agent on the CLIENT tty (suspended before `tmux attach`) must not be
	// the one captured.
	describe("tmux client -> active pane", () => {
		beforeEach(() => {
			h.clients = "/dev/ttys009|main\n";
			h.panes = paneLine("/dev/ttys020", "main");
		});

		it("binds the agent in the active pane, not the one on the client tty", async () => {
			h.scan = scan({ instances: [agentOn("/dev/ttys009", 1), agentOn("/dev/ttys020", 2)] });
			const key = fakeKey();
			await capture(key);
			expect(h.log.warn.mock.calls).toEqual([]);
			expect(key.setSettings).toHaveBeenCalledWith(expect.objectContaining({ agent: "codex", sessionId: "s2" }));
		});

		it.each([
			["no agent in the pane", () => [agentOn("/dev/ttys009", 1)], "no agent found in the focused terminal."],
			["two agents in the pane", () => [agentOn("/dev/ttys020", 1), agentOn("/dev/ttys020", 2)], "two or more agents share the focused terminal."],
		])("%s is refused with its reason", async (_name, instances, reason) => {
			h.scan = scan({ instances: instances() });
			const key = fakeKey();
			await capture(key);
			expect(h.log.warn.mock.calls).toEqual([[`AI Project: refusing capture — ${reason}`]]);
			expect(key.setSettings).not.toHaveBeenCalled();
		});
	});

	it.each(["\u2028", "\u2029", "\u0085", "\u007f", "\r"])("logSafe escapes %j in a logged bundle id", async (c) => {
		h.scan = scan();
		h.front = `com.evil${c}forged`;
		await capture(fakeKey());
		expect(h.log.warn.mock.calls).toHaveLength(1);
		expect(h.log.warn.mock.calls[0][0]).not.toContain(c);
	});

	it("a cwd carrying a newline is escaped in the indistinguishable-session line", async () => {
		// Two Claude sessions in one folder: Claude binds by folder, so the
		// capture refuses and names the folder.
		const cwd = "/tmp/p\nAI Project: forged";
		const claude = (tty: string, pid: number) => ({ kind: "claude", pid, tty, cwd, sessionId: "" });
		h.scan = scan({ instances: [claude("/dev/ttys009", 1), claude("/dev/ttys001", 2)] });
		await capture(fakeKey());
		expect(h.log.warn.mock.calls).toHaveLength(1);
		expect(h.log.warn.mock.calls[0][0], "ai-project capture: cwd is escaped").toBe(
			"AI Project: refusing capture — claude in /tmp/p\\nAI Project: forged cannot be told apart from another session there.",
		);
	});
});
