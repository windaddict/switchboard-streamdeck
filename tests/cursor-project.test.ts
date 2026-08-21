import { describe, expect, it } from "vitest";

import {
	buildCursorProjectKeyImage,
	capturePaneArgs,
	cursorChatDir,
	cursorInstancesForProject,
	type CursorInstance,
	cursorSessionId,
	cursorStateFromTranscriptLines,
	decideCursorFace,
	isCursorChatPath,
	isCursorProcess,
	paneShowsApprovalPrompt,
	parseCursorProcesses,
	selectCursorInstance,
	soleChatDir,
	withoutWorkerChildren,
} from "../src/mac/cursor-project.js";
import { deprecationBadge } from "../src/mac/deprecation.js";

const VERSION_DIR = "/Users/j/.local/share/cursor-agent/versions/2026.08.11-e8db854";
const CHAT = "/Users/j/.cursor/chats/b731b9d461b221a50ec0c5d38ce51d2c/3d9825b5-d39c-45c3-9261-c9f33b9246c1";

/** The real `ps -o pid=,ppid=,tty=,args=` output for a session plus its worker
 * child (captured live). Note `comm` is absent on purpose: it truncates at 16
 * characters for these processes, which is why identity reads from argv. */
const PS_REAL = [
	`37335  3591 ttys016  /Users/j/.local/bin/cursor-agent --use-system-ca ${VERSION_DIR}/index.js`,
	`37794 37335 ttys016  ${VERSION_DIR}/node ${VERSION_DIR}/index.js`,
	`63867  3611 ttys008  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
].join("\n");

describe("Cursor process identity", () => {
	it("parses pid/ppid/tty/args and accepts both symlink names", () => {
		const procs = parseCursorProcesses(PS_REAL);
		expect(procs).toHaveLength(3);
		expect(procs[0]).toMatchObject({ pid: 37335, ppid: 3591, tty: "ttys016" });
		expect(procs.every(isCursorProcess)).toBe(true);
	});

	it("drops the worker child so one session never looks like two", () => {
		const kept = withoutWorkerChildren(parseCursorProcesses(PS_REAL).filter(isCursorProcess));
		expect(kept.map((p) => p.pid)).toEqual([37335, 63867]);
	});

	/** The worker is recognised by its argv shape, not merely by being a child:
	 * a session started from inside another session's terminal is a REAL session
	 * and must survive the filter. */
	it("keeps a genuine session that happens to be parented by another session", () => {
		const procs = parseCursorProcesses([
			`100 3591 ttys016  /Users/j/.local/bin/cursor-agent --use-system-ca ${VERSION_DIR}/index.js`,
			`200  100 ttys020  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			`300  100 ttys016  ${VERSION_DIR}/node ${VERSION_DIR}/index.js`,
		].join("\n")).filter(isCursorProcess);
		expect(withoutWorkerChildren(procs).map((p) => p.pid)).toEqual([100, 200]);
	});

	/** A home directory with a space in it used to defeat the worker filter,
	 * leaving the worker in the list and making every key on that machine
	 * permanently ambiguous. */
	it("still recognises the worker when the home directory contains a space", () => {
		const dir = "/Users/Jane Doe/.local/share/cursor-agent/versions/2026.08.11-e8db854";
		const procs = parseCursorProcesses([
			`100 3591 ttys016  /Users/Jane Doe/.local/bin/cursor-agent --use-system-ca ${dir}/index.js`,
			`200  100 ttys016  ${dir}/node ${dir}/index.js`,
		].join("\n")).filter(isCursorProcess);
		expect(procs).toHaveLength(2);
		expect(withoutWorkerChildren(procs).map((p) => p.pid)).toEqual([100]);
	});

	it("rejects ttyless daemons and unrelated processes that merely mention cursor-agent", () => {
		const procs = parseCursorProcesses([
			`900 1 ??       ${VERSION_DIR}/node ${VERSION_DIR}/index.js`,
			"901 1 ttys003  vim /Users/j/notes/cursor-agent.md",
			"902 1 ttys004  rg cursor-agent/versions /Users/j/code",
		].join("\n"));
		expect(procs.filter(isCursorProcess)).toEqual([]);
	});
});

describe("Cursor chat-store identity", () => {
	it("recognises store files and extracts the session id", () => {
		expect(isCursorChatPath(`${CHAT}/store.db`)).toBe(true);
		expect(isCursorChatPath(`${CHAT}/store.db-wal`)).toBe(true);
		expect(isCursorChatPath(`${CHAT}/store.db-shm`)).toBe(true);
		expect(isCursorChatPath(`${CHAT}/meta.json`)).toBe(false);
		expect(cursorSessionId(cursorChatDir(`${CHAT}/store.db-shm`)))
			.toBe("3d9825b5-d39c-45c3-9261-c9f33b9246c1");
	});

	/** lsof reports RESOLVED paths, so a symlinked config directory must not
	 * stop a session being recognised — the hash/uuid/store.db shape is what
	 * identifies it. */
	it("recognises a store under a relocated or symlinked config directory", () => {
		expect(isCursorChatPath("/Volumes/ext/cfg/chats/b731b9d461b221a50ec0c5d38ce51d2c/3d9825b5-d39c-45c3-9261-c9f33b9246c1/store.db")).toBe(true);
		expect(isCursorChatPath("/Users/j/notes/chats/nothex/3d9825b5-d39c-45c3-9261-c9f33b9246c1/store.db")).toBe(false);
		// A malformed id of the right length must not pass for a session UUID.
		expect(isCursorChatPath(`${CHAT.slice(0, CHAT.lastIndexOf("/"))}/3d9825b5-d39c--45c3-9261-c9f3b9246c1/store.db`)).toBe(false);
	});

	it("collapses the three open store handles to one directory", () => {
		expect(soleChatDir([`${CHAT}/store.db`, `${CHAT}/store.db-wal`, `${CHAT}/store.db-shm`, "/dev/ttys008"]))
			.toBe(CHAT);
	});

	it("refuses to guess when zero or several chats are open", () => {
		expect(soleChatDir(["/dev/ttys008"])).toBe("");
		const other = CHAT.replace("3d9825b5", "4d9825b5");
		expect(soleChatDir([`${CHAT}/store.db`, `${other}/store.db`])).toBe("");
	});
});

describe("Cursor state from the transcript", () => {
	const user = JSON.stringify({ role: "user", message: { content: [{ type: "text", text: "hi" }] } });
	const toolUse = JSON.stringify({ role: "assistant", message: { content: [{ type: "tool_use", name: "Shell", input: {} }] } });
	const text = JSON.stringify({ role: "assistant", message: { content: [{ type: "text", text: "done" }] } });

	it("reads the turn terminator as idle", () => {
		const ended = JSON.stringify({ type: "turn_ended", status: "success" });
		expect(cursorStateFromTranscriptLines([user, toolUse, text, ended])).toBe("waiting");
	});

	it("treats a turn that ended in error as idle too — the prompt is back", () => {
		const failed = JSON.stringify({ type: "turn_ended", status: "error", error: "Connection failed repeatedly" });
		expect(cursorStateFromTranscriptLines([user, toolUse, failed])).toBe("waiting");
	});

	it("reads a missing terminator as a turn still in flight", () => {
		expect(cursorStateFromTranscriptLines([user, toolUse, text])).toBe("working");
	});

	/** Measured: while Cursor holds on an approval prompt the transcript
	 * contains ONLY the user's message — the tool record is appended after the
	 * tool runs. So this shape must read as in-flight, not idle. */
	it("reads the blocked-on-approval shape as in flight, not idle", () => {
		expect(cursorStateFromTranscriptLines([user])).toBe("working");
	});

	it("treats an unprompted session (no records) as idle", () => {
		expect(cursorStateFromTranscriptLines([])).toBe("waiting");
		expect(cursorStateFromTranscriptLines(["", "   "])).toBe("waiting");
	});

	it("treats unparsable content as no evidence rather than a verdict", () => {
		expect(cursorStateFromTranscriptLines(["{ truncated", "not json"])).toBe("unknown");
	});

	it("skips a clipped record at the window edge and uses the next real one", () => {
		expect(cursorStateFromTranscriptLines([user, '{"role":"assist'])).toBe("working");
	});

	it("ignores records that are neither a terminator nor conversational", () => {
		const meta = JSON.stringify({ type: "attachment", path: "/tmp/x" });
		const ended = JSON.stringify({ type: "turn_ended", status: "success" });
		expect(cursorStateFromTranscriptLines([user, ended, meta])).toBe("waiting");
	});
});

describe("Approval-prompt detection", () => {
	it("matches Cursor's real approval block", () => {
		const pane = [
			"  $ wc -c note.txt Waiting for approval...",
			" Run this command?",
			" Not in allowlist: wc",
			"  → Run (once) (y)",
		].join("\n");
		expect(paneShowsApprovalPrompt(pane)).toBe(true);
	});

	it("fails safe on ordinary output and on unrecognised wording", () => {
		expect(paneShowsApprovalPrompt("Reading files…\n$ wc -c note.txt\n5 note.txt")).toBe(false);
		expect(paneShowsApprovalPrompt("")).toBe(false);
		expect(paneShowsApprovalPrompt("Permission needed for this action")).toBe(false);
	});

	/** "Run this command?" is a phrase that can appear in scrolled-past output
	 * (a README, a docs page); on its own it must not turn the key amber. */
	it("does not fire on the question alone without Cursor's choice line", () => {
		expect(paneShowsApprovalPrompt("The docs say: Run this command? Then reboot.")).toBe(false);
		expect(paneShowsApprovalPrompt("Run this command?\n  → Run (once) (y)")).toBe(true);
	});

	/** Scrollback keeps an ALREADY-ANSWERED prompt, so including it would hold
	 * the key amber while the agent is busy working. Live screen only. */
	it("captures the live screen only, never scrollback", () => {
		expect(capturePaneArgs("%5")).toEqual(["capture-pane", "-p", "-t", "%5"]);
	});
});

describe("Selecting the key's session", () => {
	const make = (pid: number, cwd: string, sessionId: string): CursorInstance => ({
		pid, tty: `/dev/ttys00${pid}`, cwd, chatDir: `${CHAT}-${pid}`, sessionId, state: "working",
	});
	const a = make(1, "/Users/j/code/app", "aaaaaaaa-1111-4111-8111-111111111111");
	const b = make(2, "/Users/j/code/app", "bbbbbbbb-2222-4222-8222-222222222222");

	it("matches a project ignoring a trailing slash", () => {
		expect(cursorInstancesForProject([a, b], "/Users/j/code/app/")).toHaveLength(2);
	});

	it("uses the captured id when several sessions share a folder", () => {
		expect(selectCursorInstance([a, b], "/Users/j/code/app", b.sessionId)).toBe(b);
	});

	/** The captured id is binding. Silently adopting the neighbour would send
	 * the operator's keystrokes to a conversation they never captured. */
	it("refuses to re-point at a same-folder neighbour when the captured session is gone", () => {
		expect(selectCursorInstance([a], "/Users/j/code/app", b.sessionId)).toBeNull();
	});

	it("refuses a captured id that somehow matches more than one live session", () => {
		const twin = { ...a, pid: 9, sessionId: b.sessionId };
		expect(selectCursorInstance([b, twin], "/Users/j/code/app", b.sessionId)).toBeNull();
	});

	it("takes a lone session when nothing was captured, but never picks among several", () => {
		expect(selectCursorInstance([a], "/Users/j/code/app", "")).toBe(a);
		expect(selectCursorInstance([a, b], "/Users/j/code/app", "")).toBeNull();
	});
});

describe("Cursor key face", () => {
	const args = { project: "/Users/j/code/switchboard", host: "tmux" as const, hot: true, state: "working" as const };

	it("never emits hsl() — the key rasterizer paints it black", () => {
		for (const state of ["none", "working", "blocked", "waiting", "unknown"] as const) {
			for (const hot of [true, false]) {
				expect(buildCursorProjectKeyImage({ ...args, hot, state })).not.toContain("hsl(");
			}
		}
	});

	/** Superseded by AI Project: every face carries the shared marker, and it
	 * must not reintroduce hsl() (the key rasterizer paints that black).
	 * Delete this test with the action. */
	it("carries the deprecation badge on every state, still hex-only", () => {
		for (const state of ["none", "working", "blocked", "waiting", "unknown"] as const) {
			for (const hot of [true, false]) {
				const svg = buildCursorProjectKeyImage({ ...args, hot, state });
				expect(svg).toContain(deprecationBadge());
				expect(svg).not.toContain("hsl(");
			}
		}
	});

	it("gives each state a distinct face and shows the project and host", () => {
		const svg = buildCursorProjectKeyImage(args);
		expect(svg).toContain("switchbo…"); // truncated to fit the key
		expect(svg).toContain("TMUX");
		expect(svg).toContain("#4E9CFF");
		expect(buildCursorProjectKeyImage({ ...args, state: "blocked" })).toContain("#F0A63C");
		expect(buildCursorProjectKeyImage({ ...args, state: "none" })).toContain("stroke-dasharray");
	});

	it("escapes a project name that would otherwise break the SVG", () => {
		const svg = buildCursorProjectKeyImage({ ...args, project: "/tmp/a<b&c" });
		expect(svg).toContain("a&lt;b&amp;c");
		expect(svg).not.toContain("a<b&c");
	});

	it("animates only while working", () => {
		const frames = new Set([0, 1, 2].map((spin) => buildCursorProjectKeyImage({ ...args, spin })));
		expect(frames.size).toBe(3);
		const idle = new Set([0, 1, 2].map((spin) => buildCursorProjectKeyImage({ ...args, state: "waiting", spin })));
		expect(idle.size).toBe(1);
	});
});

describe("Composing the face from all the evidence", () => {
	const base = { hasTarget: true, matchCount: 1, instanceState: "working" as const,
		scanStatus: "ok" as const, hasCapturedId: true, blockedOnPane: false };

	it("shows nothing when the key has no project configured", () => {
		expect(decideCursorFace({ ...base, hasTarget: false })).toBe("none");
	});

	it("passes a resolved session's own state straight through", () => {
		expect(decideCursorFace(base)).toBe("working");
		expect(decideCursorFace({ ...base, instanceState: "waiting" })).toBe("waiting");
	});

	it("turns amber only when an IN-FLIGHT turn's pane shows the prompt", () => {
		expect(decideCursorFace({ ...base, blockedOnPane: true })).toBe("blocked");
		// Leftover approval text under an idle prompt must not light the key.
		expect(decideCursorFace({ ...base, instanceState: "waiting", blockedOnPane: true })).toBe("waiting");
	});

	it("is unknown when several sessions match and none was captured", () => {
		expect(decideCursorFace({ ...base, instanceState: null, matchCount: 2, hasCapturedId: false })).toBe("unknown");
	});

	/** Consistent with the binding-capture rule: if the captured session is gone,
	 * neighbours sharing the folder are not this key's, so the key has no target
	 * rather than an ambiguous one. */
	it("is none when a captured session has exited, even with neighbours in the folder", () => {
		expect(decideCursorFace({ ...base, instanceState: null, matchCount: 2, hasCapturedId: true })).toBe("none");
		expect(decideCursorFace({ ...base, instanceState: null, matchCount: 2, hasCapturedId: true, scanStatus: "unknown" })).toBe("unknown");
	});

	it("is none — not unknown — when a good scan simply found no session", () => {
		expect(decideCursorFace({ ...base, instanceState: null, matchCount: 0 })).toBe("none");
	});

	/** An incomplete scan cannot prove the one session it found is the only one
	 * in the folder; without a captured id the honest answer is "don't know". */
	it("refuses to look confident on an incomplete scan with no captured id", () => {
		expect(decideCursorFace({ ...base, scanStatus: "unknown", hasCapturedId: false })).toBe("unknown");
		expect(decideCursorFace({ ...base, scanStatus: "unknown", hasCapturedId: true })).toBe("working");
		expect(decideCursorFace({ ...base, instanceState: null, matchCount: 0, scanStatus: "unknown" })).toBe("unknown");
	});
});
