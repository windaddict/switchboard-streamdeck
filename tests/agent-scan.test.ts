import { describe, expect, it } from "vitest";

import type { AgentInstance } from "../src/mac/agent-project.js";
import {
	type AgentPane,
	agentInstancesFor,
	agentPaneForTty,
	agentSparkForWindow,
	bindsBySession,
	agentTmuxFocusArgs,
	captureAgentPaneArgs,
	kindsToScan,
	kindTrusted,
	LIST_AGENT_PANES_ARGS,
	paneTitlesByTty,
	parseAgentPanes,
	selectAgentInstance,
} from "../src/mac/agent-scan.js";

const inst = (
	kind: AgentInstance["kind"],
	cwd: string,
	sessionId: string,
	pid = 1,
): AgentInstance => ({ kind, pid, tty: `/dev/ttys00${pid}`, cwd, sessionId, state: "working" });

describe("Listing panes for the unified key", () => {
	/** ASCII unit separator — the same one the format string uses. */
	const FS = "\u001f";
	const row = (...fields: string[]) => fields.join(FS);

	it("asks tmux for the ids AND the title in one probe", () => {
		// Two probes could disagree with each other between calls.
		const fmt = LIST_AGENT_PANES_ARGS[LIST_AGENT_PANES_ARGS.length - 1];
		for (const field of ["#{pane_tty}", "#{window_id}", "#{pane_id}", "#{pane_title}"]) {
			expect(fmt).toContain(field);
		}
		expect(fmt).toContain(FS); // and separates them unambiguously
	});

	it("parses a normal listing, including who would receive keystrokes", () => {
		const panes = parseAgentPanes([
			row("/dev/ttys005", "dev", "@1", "%1", "1", "1", "✳ Review next priorities"),
			row("/dev/ttys010", "dev", "@1", "%7", "0", "1", "~/ea-system"),
		].join("\n"));
		expect(panes).toHaveLength(2);
		expect(panes[0]).toEqual({
			tty: "/dev/ttys005", session: "dev", windowId: "@1", paneId: "%1",
			receivesKeys: true, title: "✳ Review next priorities",
		});
		expect(panes[1].receivesKeys).toBe(false); // not the active pane
	});

	/** Session names and pane titles are user-controlled. The older per-agent
	 * formats used `|` and had to hunt for an `@window`/`%pane` landmark, which a
	 * session named `…@x|%y…` could defeat. With a separator that cannot occur in
	 * either field, `|` is simply an ordinary character. */
	it("treats `|` as ordinary text in both the session name and the title", () => {
		const panes = parseAgentPanes(row("/dev/ttys009", "my|weird|session", "@3", "%9", "1", "1", "fix a|b parsing"));
		expect(panes).toHaveLength(1);
		expect(panes[0].session).toBe("my|weird|session");
		expect(panes[0].title).toBe("fix a|b parsing");
	});

	it("is not fooled by a session name that mimics the id fields", () => {
		const panes = parseAgentPanes(row("/dev/ttys009", "@9|%9 decoy", "@3", "%9", "1", "1", "t"));
		expect(panes[0].windowId).toBe("@3");
		expect(panes[0].paneId).toBe("%9");
		expect(panes[0].session).toBe("@9|%9 decoy");
	});

	it("skips malformed lines rather than guessing at them", () => {
		expect(parseAgentPanes("garbage\n\n" + row("/dev/ttys1", "s", "nope", "alsonope", "1", "1", "t"))).toEqual([]);
		expect(parseAgentPanes(row("/dev/ttys1", "s", "@1", "%1", "1"))).toEqual([]); // truncated
	});

	it("indexes titles by tty for Claude's title signal", () => {
		const panes = parseAgentPanes(row("/dev/ttys005", "dev", "@1", "%1", "1", "1", "⠂ working"));
		expect(paneTitlesByTty(panes).get("/dev/ttys005")).toBe("⠂ working");
	});

	it("finds the pane hosting a tty", () => {
		const panes: AgentPane[] = parseAgentPanes(row("/dev/ttys005", "dev", "@1", "%1", "1", "1", "t"));
		expect(agentPaneForTty(panes, "/dev/ttys005")?.paneId).toBe("%1");
		expect(agentPaneForTty(panes, "/dev/ttys999")).toBeUndefined();
	});
});

describe("Driving tmux", () => {
	const pane: AgentPane = {
		tty: "/dev/ttys005", session: "dev", windowId: "@3", paneId: "%9",
		receivesKeys: true, title: "t",
	};

	it("switches client, window and pane in that order", () => {
		expect(agentTmuxFocusArgs(pane, "/dev/ttys001")).toEqual([
			["switch-client", "-c", "/dev/ttys001", "-t", "dev"],
			["select-window", "-t", "@3"],
			["select-pane", "-t", "%9"],
		]);
	});

	it("omits switch-client when there is no client to switch", () => {
		expect(agentTmuxFocusArgs(pane, "")).toEqual([
			["select-window", "-t", "@3"],
			["select-pane", "-t", "%9"],
		]);
	});

	/** Scrollback keeps an already-answered prompt; matching it would hold the
	 * key amber while the agent is actually working. */
	it("captures the live screen only, never scrollback", () => {
		expect(captureAgentPaneArgs("%9")).toEqual(["capture-pane", "-p", "-t", "%9"]);
	});
});

describe("Choosing what to scan", () => {
	it("scans only the captured kind once a key has been taught", () => {
		expect(kindsToScan("cursor")).toEqual(["cursor"]);
		expect(kindsToScan("claude")).toEqual(["claude"]);
	});

	it("scans all three only while the key is still untaught", () => {
		expect(kindsToScan(undefined).sort()).toEqual(["claude", "codex", "cursor"]);
	});
});

describe("Selecting the key's session", () => {
	const codexA = inst("codex", "/Users/j/app", "aaaa", 1);
	const codexB = inst("codex", "/Users/j/app", "bbbb", 2);
	const cursorA = inst("cursor", "/Users/j/app", "cccc", 3);
	const claudeA = inst("claude", "/Users/j/app", "", 4);
	const claudeB = inst("claude", "/Users/j/app", "", 5);
	const all = [codexA, codexB, cursorA, claudeA];

	it("never mixes kinds, even in the same folder", () => {
		expect(agentInstancesFor(all, "cursor", "/Users/j/app")).toEqual([cursorA]);
		expect(agentInstancesFor(all, "codex", "/Users/j/app")).toHaveLength(2);
	});

	it("matches a project ignoring a trailing slash", () => {
		expect(agentInstancesFor(all, "cursor", "/Users/j/app/")).toEqual([cursorA]);
	});

	it("uses the captured id when several sessions share a folder", () => {
		expect(selectAgentInstance(all, "codex", "/Users/j/app", "bbbb")).toBe(codexB);
	});

	/** The captured id is binding: adopting a neighbour would send the
	 * operator's window focus to a conversation they never captured. */
	it("refuses to fall back to a neighbour when the captured session is gone", () => {
		expect(selectAgentInstance([codexA, cursorA], "codex", "/Users/j/app", "bbbb")).toBeNull();
	});

	it("takes a lone session when nothing was captured, but never picks among several", () => {
		expect(selectAgentInstance([codexA, cursorA], "codex", "/Users/j/app", "")).toBe(codexA);
		expect(selectAgentInstance(all, "codex", "/Users/j/app", "")).toBeNull();
	});

	/** Claude has no session id at all, so a folder with two Claude sessions is
	 * genuinely ambiguous and must not be resolved by picking the first. */
	it("treats two Claude sessions in one folder as ambiguous", () => {
		expect(selectAgentInstance([claudeA], "claude", "/Users/j/app", "")).toBe(claudeA);
		expect(selectAgentInstance([claudeA, claudeB], "claude", "/Users/j/app", "")).toBeNull();
	});

	/** A present-but-unidentified session (empty sessionId) is visible to the
	 * tmux spark but must never be SELECTABLE for a kind that has conversation
	 * ids — not against a captured id, and not as a lone match either. The
	 * second case is the sharp one: capture() validates through this function,
	 * so allowing it would let a key store an empty binding that afterwards
	 * adopts whichever sole session sits in the folder. */
	it("never selects an unnameable Codex or Cursor session", () => {
		const nameless = inst("cursor", "/Users/j/app", "", 7);
		expect(selectAgentInstance([nameless], "cursor", "/Users/j/app", "cccc")).toBeNull();
		expect(selectAgentInstance([cursorA, nameless], "cursor", "/Users/j/app", "cccc")).toBe(cursorA);
		// the lone-match path must reject it too, or capture() would accept it
		expect(selectAgentInstance([nameless], "cursor", "/Users/j/app", "")).toBeNull();
		// and it must not make an identified neighbour look ambiguous
		expect(selectAgentInstance([cursorA, nameless], "cursor", "/Users/j/app", "")).toBe(cursorA);
	});

	/** Claude legitimately has no conversation id, so the same empty string must
	 * NOT lock it out of selection. */
	it("still selects Claude, which has no session id by nature", () => {
		expect(bindsBySession("claude")).toBe(false);
		expect(bindsBySession("codex")).toBe(true);
		expect(bindsBySession("cursor")).toBe(true);
		expect(selectAgentInstance([claudeA], "claude", "/Users/j/app", "")).toBe(claudeA);
	});

	it("finds nothing for a folder that has no session of that kind", () => {
		expect(selectAgentInstance(all, "cursor", "/Users/j/other", "")).toBeNull();
	});
});

describe("Whose probe failed", () => {
	/** Several keys share one snapshot. A single global "something broke" flag
	 * would either let a Cursor key ignore a Cursor failure, or gray it out
	 * because an unrelated Claude probe fell over. */
	it("degrades only the kinds that actually failed", () => {
		const snap = { failedKinds: ["claude" as const] };
		expect(kindTrusted(snap, "claude")).toBe(false);
		expect(kindTrusted(snap, "cursor")).toBe(true);
		expect(kindTrusted(snap, "codex")).toBe(true);
	});

	it("trusts every kind when nothing failed", () => {
		for (const kind of ["claude", "codex", "cursor"] as const) {
			expect(kindTrusted({ failedKinds: [] }, kind)).toBe(true);
		}
	});
});

describe("The tmux key's agent spark", () => {
	const pane = (tty: string, windowName: string, session = "dev") => ({ tty, session, windowName });
	const panes = [
		pane("/dev/ttys001", "movingavg"), pane("/dev/ttys002", "movingavg"),
		pane("/dev/ttys003", "copybug"), pane("/dev/ttys009", "empty"),
	];
	const at = (kind: AgentInstance["kind"], tty: string, state: AgentInstance["state"]): AgentInstance =>
		({ kind, pid: 1, tty, cwd: "/x", sessionId: "", state });

	it("shows nothing when the window holds no agent", () => {
		expect(agentSparkForWindow([], panes, "dev", "empty")).toBe("none");
		expect(agentSparkForWindow([at("codex", "/dev/ttys003", "working")], panes, "dev", "empty")).toBe("none");
	});

	/** Matching is by tty, never by pane_current_command — which is exactly why
	 * the old Claude-only check could not see Cursor, since cursor-agent
	 * presents itself as `node`. */
	it("finds Codex and Cursor, not just Claude", () => {
		expect(agentSparkForWindow([at("cursor", "/dev/ttys001", "working")], panes, "dev", "movingavg")).toBe("working");
		expect(agentSparkForWindow([at("codex", "/dev/ttys003", "working")], panes, "dev", "copybug")).toBe("working");
	});

	it("is working when ANY pane in the window is mid-turn", () => {
		const both = [at("codex", "/dev/ttys001", "waiting"), at("cursor", "/dev/ttys002", "working")];
		expect(agentSparkForWindow(both, panes, "dev", "movingavg")).toBe("working");
	});

	it("is waiting when agents are present but none is computing", () => {
		expect(agentSparkForWindow([at("codex", "/dev/ttys001", "waiting")], panes, "dev", "movingavg")).toBe("waiting");
	});

	/** This key has no amber to spend — amber belongs to the AI Project key,
	 * which knows WHOSE approval is wanted. Blocked is not computing, so it
	 * reports waiting: less information, not wrong information. */
	it("folds blocked into waiting rather than claiming to be idle-or-busy", () => {
		expect(agentSparkForWindow([at("cursor", "/dev/ttys001", "blocked")], panes, "dev", "movingavg")).toBe("waiting");
	});

	it("never leaks state across windows or sessions", () => {
		const inst = [at("codex", "/dev/ttys003", "working")];
		expect(agentSparkForWindow(inst, panes, "dev", "movingavg")).toBe("none");
		expect(agentSparkForWindow(inst, panes, "other", "copybug")).toBe("none");
	});
});
