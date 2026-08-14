import { describe, expect, it } from "vitest";

import {
	buildCodexProjectKeyImage,
	codexInstancesForProject,
	codexRolloutOriginator,
	codexStateFromRolloutLines,
	codexTmuxFocusArgs,
	isInteractiveCodex,
	isRolloutPath,
	parseCodexPanes,
	parseCodexProcesses,
	parseLsofEntries,
	rolloutSessionId,
	selectCodexInstance,
} from "../src/mac/codex-project.js";

const event = (type: string) => JSON.stringify({ type: "event_msg", payload: { type } });

describe("Codex process identity", () => {
	const rows = parseCodexProcesses([
		"101 ttys001 codex codex",
		"102 ttys002 /opt/bin/codex /opt/bin/codex --search",
		"103 ttys003 codex codex exec do-work",
		"104 ?? codex codex app-server",
		"105 ttys004 node node codex",
		"106 ttys005 codex codex -c model=foo exec do-work",
		"107 ttys006 codex codex review this PR",
	].join("\n"));

	it("accepts interactive TUI invocations", () => {
		expect(rows.filter(isInteractiveCodex).map((p) => p.pid)).toEqual([101, 102, 103, 106, 107]);
	});

	it("rejects subcommands, ttyless services, and wrappers without evidence", () => {
		expect(rows.filter((p) => !isInteractiveCodex(p)).map((p) => p.pid)).toEqual([104, 105]);
	});

	it("uses rollout originator—not ambiguous argv words—as the authoritative gate", () => {
		expect(codexRolloutOriginator([JSON.stringify({ type: "session_meta", payload: { originator: "codex-tui" } })])).toBe("codex-tui");
		expect(codexRolloutOriginator([JSON.stringify({ type: "session_meta", payload: { originator: "codex-exec" } })])).toBe("codex-exec");
		expect(codexRolloutOriginator(["partial"])).toBe("");
	});
});

describe("lsof and rollout identity", () => {
	const out = "p101\nccodex\nfcwd\nn/Users/j/code/app\nf12\nn/alt/.codex/sessions/2026/08/14/rollout-2026-08-14T01-02-03-019ffe6c-ccf2-7fd1-b921-97dcd78fba71.jsonl\n";
	it("preserves fd type so cwd and rollout cannot be confused", () => {
		expect(parseLsofEntries(out)).toEqual([
			{ pid: 101, fd: "cwd", name: "/Users/j/code/app" },
			{ pid: 101, fd: "12", name: "/alt/.codex/sessions/2026/08/14/rollout-2026-08-14T01-02-03-019ffe6c-ccf2-7fd1-b921-97dcd78fba71.jsonl" },
		]);
	});
	it("recognizes relocated session roots and extracts the stable UUID", () => {
		const path = parseLsofEntries(out)[1].name;
		expect(isRolloutPath(path)).toBe(true);
		expect(rolloutSessionId(path)).toBe("019ffe6c-ccf2-7fd1-b921-97dcd78fba71");
		expect(isRolloutPath("/tmp/not-a-rollout.jsonl")).toBe(false);
	});
});

describe("Codex rollout state", () => {
	it("working after task start and waiting after completion", () => {
		expect(codexStateFromRolloutLines([event("task_started")])).toBe("working");
		expect(codexStateFromRolloutLines([event("task_started"), event("task_complete")])).toBe("waiting");
	});
	it("approval/user-input requests are blocked, not working", () => {
		expect(codexStateFromRolloutLines([event("task_started"), event("approval_request")])).toBe("blocked");
		expect(codexStateFromRolloutLines([event("request_user_input")])).toBe("blocked");
	});
	it("errors, unknown tails, and partial records are unknown", () => {
		expect(codexStateFromRolloutLines([event("task_started"), event("task_error")])).toBe("unknown");
		expect(codexStateFromRolloutLines(["garbage", '{"type":"event_msg"'])).toBe("unknown");
		expect(codexStateFromRolloutLines([JSON.stringify({ type: "response_item", payload: { type: "message" } })])).toBe("unknown");
	});
});

describe("project/session selection", () => {
	const base = {
		tty: "/dev/ttys001", cwd: "/Users/j/code/app", rolloutPath: "/x", state: "waiting" as const,
	};
	const instances = [
		{ ...base, pid: 1, sessionId: "one" },
		{ ...base, pid: 2, tty: "/dev/ttys002", sessionId: "two", state: "working" as const },
	];
	it("pins a captured identity even when another same-cwd session is working", () => {
		expect(selectCodexInstance(instances, "/Users/j/code/app/", "one")?.pid).toBe(1);
	});
	it("does not guess when several sessions share a cwd", () => {
		expect(selectCodexInstance(instances, "/Users/j/code/app", "missing")).toBeNull();
		expect(codexInstancesForProject(instances, "/Users/j/code/app")).toHaveLength(2);
	});
	it("falls back when exactly one live instance matches", () => {
		expect(selectCodexInstance(instances.slice(0, 1), "/Users/j/code/app", "old")?.pid).toBe(1);
	});
});

describe("tmux stable targeting", () => {
	it("parses stable ids and selects client, window, then exact pane", () => {
		const panes = parseCodexPanes("/dev/ttys010|dev|work|@7|%12|1|1\ninvalid");
		expect(panes).toEqual([{ tty: "/dev/ttys010", session: "dev|work", windowId: "@7", paneId: "%12", receivesKeys: true }]);
		expect(codexTmuxFocusArgs(panes[0], "/dev/ttys001")).toEqual([
			["switch-client", "-c", "/dev/ttys001", "-t", "dev|work"],
			["select-window", "-t", "@7"],
			["select-pane", "-t", "%12"],
		]);
	});
});

describe("Codex key face", () => {
	const base = { project: "/Users/j/code/a&b", host: "tmux" as const, hot: false };
	it("renders distinct working, blocked, waiting, unknown, and absent states", () => {
		const working = buildCodexProjectKeyImage({ ...base, state: "working", spin: 1 });
		expect(working).toContain("#4E9CFF");
		expect(working).toContain('cx="65"');
		expect(buildCodexProjectKeyImage({ ...base, state: "blocked" })).toContain("#F0A63C");
		expect(buildCodexProjectKeyImage({ ...base, state: "waiting" })).toContain("#F2FFF6");
		expect(buildCodexProjectKeyImage({ ...base, state: "unknown" })).toContain("#8B9490");
		expect(buildCodexProjectKeyImage({ ...base, state: "none" })).toContain("stroke-dasharray");
	});
	it("escapes project text and emits no hsl colors", () => {
		const svg = buildCodexProjectKeyImage({ ...base, state: "waiting" });
		expect(svg).toContain("a&amp;b");
		expect(svg).not.toContain("hsl(");
	});
});
