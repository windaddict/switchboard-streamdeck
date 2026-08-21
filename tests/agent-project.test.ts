import { describe, expect, it } from "vitest";

import { deprecationBadge } from "../src/mac/deprecation.js";
import {
	type AgentHost,
	type AgentInstance,
	type AgentKind,
	agentForFocusedTty,
	blockedEvidenceFor,
	buildAgentProjectKeyImage,
	decideAgentFace,
	paneShowsAgentPrompt,
} from "../src/mac/agent-project.js";

const KINDS: readonly AgentKind[] = ["claude", "codex", "cursor"];
const HOSTS: readonly AgentHost[] = ["tmux", "iterm", "terminal", ""];

describe("How trustworthy a blocked verdict can be", () => {
	/** Codex writes "waiting for approval" into its own rollout log, so it is
	 * knowable without a terminal at all. */
	it("treats codex as authoritative on every host", () => {
		for (const host of HOSTS) {
			expect(blockedEvidenceFor("codex", host)).toBe("authoritative");
		}
	});

	/** Claude and Cursor record nothing that separates blocked from busy; the
	 * only readable terminal is a tmux pane. */
	it("needs a tmux pane for claude and cursor, and admits it has nothing otherwise", () => {
		for (const kind of ["claude", "cursor"] as const) {
			expect(blockedEvidenceFor(kind, "tmux")).toBe("terminal");
			expect(blockedEvidenceFor(kind, "iterm")).toBe("unavailable");
			expect(blockedEvidenceFor(kind, "terminal")).toBe("unavailable");
			expect(blockedEvidenceFor(kind, "")).toBe("unavailable");
		}
	});
});

describe("Approval-prompt detection", () => {
	/** Claude's BASH approval, as it renders on screen. */
	const CLAUDE_BASH = [
		"  Bash command",
		"  rm -rf build/",
		"  This command requires approval",
		"",
		"  Do you want to proceed?",
		"  1. Yes",
		"  2. Yes, and don't ask again for rm commands",
		"  3. No, and tell Claude what to do differently (esc)",
	].join("\n");

	/** Claude's EDIT approval — a different sentence entirely, which is why the
	 * matcher keys on the shared "Do you want to …?" stem. */
	const CLAUDE_EDIT = [
		"  Edit file",
		"  note.txt",
		"",
		"  Do you want to make this edit to note.txt?",
		"  1. Yes",
		"  2. Yes, allow all edits during this session (shift+tab)",
		"  3. No, and tell Claude what to do differently (esc)",
	].join("\n");

	/** NOT an approval to act on: Claude's folder-trust prompt at startup. It
	 * carries the same "1. Yes" choice line, so the choice line alone can never
	 * be the whole test. */
	const CLAUDE_TRUST = [
		"  Quick safety check: Is this a project you created or one you trust?",
		"  1. Yes, I trust this folder",
		"  2. No, exit",
	].join("\n");

	it("matches both of Claude's measured approval wordings", () => {
		expect(paneShowsAgentPrompt("claude", CLAUDE_BASH)).toBe(true);
		expect(paneShowsAgentPrompt("claude", CLAUDE_EDIT)).toBe(true);
	});

	it("does not fire on Claude's folder-trust prompt", () => {
		expect(paneShowsAgentPrompt("claude", CLAUDE_TRUST)).toBe(false);
	});

	it("fails safe on ordinary Claude output and on unrecognised wording", () => {
		expect(paneShowsAgentPrompt("claude", "✳ Thinking… (12s · esc to interrupt)")).toBe(false);
		expect(paneShowsAgentPrompt("claude", "")).toBe(false);
		expect(paneShowsAgentPrompt("claude", "Permission needed for this action")).toBe(false);
		// The question without the choice list is not enough on its own.
		expect(paneShowsAgentPrompt("claude", "The README asks: Do you want to proceed?")).toBe(false);
		// …and the choice list without the question is not enough either.
		expect(paneShowsAgentPrompt("claude", "1. Yes\n2. No")).toBe(false);
	});

	it("matches both of Cursor's wordings", () => {
		expect(paneShowsAgentPrompt("cursor", "  $ wc -c note.txt Waiting for approval...")).toBe(true);
		expect(paneShowsAgentPrompt("cursor", " Run this command?\n Not in allowlist: wc\n  → Run (once) (y)")).toBe(true);
	});

	/** "Run this command?" can appear in scrolled-past output (a README, a docs
	 * page); on its own it must not turn the key amber. */
	it("does not fire on Cursor's question without its choice line", () => {
		expect(paneShowsAgentPrompt("cursor", "The docs say: Run this command? Then reboot.")).toBe(false);
		expect(paneShowsAgentPrompt("cursor", "Reading files…\n$ wc -c note.txt\n5 note.txt")).toBe(false);
	});

	/** Codex's own log already carries `blocked`, so scraping it could only add
	 * false positives. It is never scraped, whatever the pane happens to show. */
	it("never scrapes for codex, even given text that would match another kind", () => {
		for (const text of [CLAUDE_BASH, CLAUDE_EDIT, "Waiting for approval", "Run this command?\nRun (once)", ""]) {
			expect(paneShowsAgentPrompt("codex", text)).toBe(false);
		}
	});
});

describe("Finding the agent in the focused terminal", () => {
	const make = (pid: number, tty: string, kind: AgentKind = "claude"): AgentInstance => ({
		kind, pid, tty, cwd: "/Users/j/code/app", sessionId: "", state: "working",
	});

	it("returns the one instance owning the focused tty", () => {
		const a = make(1, "/dev/ttys001");
		const b = make(2, "/dev/ttys002", "codex");
		expect(agentForFocusedTty([a, b], "/dev/ttys002")).toBe(b);
	});

	it("returns null when nothing owns that tty", () => {
		expect(agentForFocusedTty([make(1, "/dev/ttys001")], "/dev/ttys009")).toBeNull();
		expect(agentForFocusedTty([], "/dev/ttys001")).toBeNull();
	});

	/** Two can genuinely share a tty: an agent launched from inside another
	 * agent's terminal inherits it. Picking either would be a guess. */
	it("refuses to pick when two agents share the focused tty", () => {
		const a = make(1, "/dev/ttys001");
		const b = make(2, "/dev/ttys001", "cursor");
		expect(agentForFocusedTty([a, b], "/dev/ttys001")).toBeNull();
	});
});

describe("Composing the face from all the evidence", () => {
	const base = {
		hasTarget: true, matchCount: 1, instanceState: "working" as const,
		scanStatus: "ok" as const, hasCapturedId: true, blockedProbe: "clear",
	};

	for (const kind of KINDS) {
		describe(kind, () => {
			const b = { ...base, kind };

			it("shows nothing when the key has no project configured", () => {
				expect(decideAgentFace({ ...b, hasTarget: false })).toBe("none");
			});

			it("passes a resolved session's own state straight through", () => {
				expect(decideAgentFace(b)).toBe("working");
				expect(decideAgentFace({ ...b, instanceState: "waiting" })).toBe("waiting");
				expect(decideAgentFace({ ...b, instanceState: "blocked" })).toBe("blocked");
				expect(decideAgentFace({ ...b, instanceState: "unknown" })).toBe("unknown");
			});

			it("is unknown when several sessions match and none was captured", () => {
				expect(decideAgentFace({ ...b, instanceState: null, matchCount: 2, hasCapturedId: false })).toBe("unknown");
			});

			/** Consistent with the binding-capture rule: if the captured session is
			 * gone, neighbours sharing the folder are not this key's, so the key has
			 * no target rather than an ambiguous one. */
			it("is none when a captured session has exited, even with neighbours in the folder", () => {
				expect(decideAgentFace({ ...b, instanceState: null, matchCount: 2, hasCapturedId: true })).toBe("none");
				expect(decideAgentFace({ ...b, instanceState: null, matchCount: 2, hasCapturedId: true, scanStatus: "unknown" })).toBe("unknown");
			});

			it("is none — not unknown — when a good scan simply found no session", () => {
				expect(decideAgentFace({ ...b, instanceState: null, matchCount: 0 })).toBe("none");
			});

			/** `scanStatus` is THIS kind's own probe. If it failed, nothing about
			 * this session was observed this tick — and a captured id says WHICH
			 * session is meant, not that an unobserved one can be trusted. So the
			 * exemption a captured id once bought is deliberately gone. */
			it("refuses to look confident whenever its own probe failed", () => {
				expect(decideAgentFace({ ...b, scanStatus: "unknown", hasCapturedId: false })).toBe("unknown");
				expect(decideAgentFace({ ...b, scanStatus: "unknown", hasCapturedId: true })).toBe("unknown");
				expect(decideAgentFace({ ...b, instanceState: null, matchCount: 0, scanStatus: "unknown" })).toBe("unknown");
			});

			/** ...but a GOOD probe stays confident, captured id or not. */
			it("still paints the real state when its probe answered", () => {
				expect(decideAgentFace({ ...b, scanStatus: "ok", hasCapturedId: true })).toBe("working");
				expect(decideAgentFace({ ...b, scanStatus: "ok", hasCapturedId: false })).toBe("working");
			});

			it("does not invent a blocked face when there is no instance at all", () => {
				expect(decideAgentFace({ ...b, instanceState: null, matchCount: 0, blockedProbe: "blocked" })).toBe("none");
			});
		});
	}

	/**
	 * REGRESSION TEST for the bug in the Cursor-only predecessor
	 * (`decideCursorFace`), which only upgraded to `blocked` when the instance
	 * read `working`. MEASURED: Claude Code keeps its IDLE "✳" title marker up
	 * while its approval prompt is on screen, so a blocked Claude session reads
	 * `waiting`. Under the old rule this branch was unreachable for Claude and
	 * the whole feature was silently dead.
	 */
	it("turns a WAITING claude amber when its pane shows the prompt", () => {
		expect(decideAgentFace({ ...base, kind: "claude", instanceState: "waiting", blockedProbe: "blocked" })).toBe("blocked");
	});

	/** Cursor's blocked session has no turn_ended record yet, so it reads
	 * `working` — the other half of the same rule. */
	it("turns a WORKING cursor amber when its pane shows the prompt", () => {
		expect(decideAgentFace({ ...base, kind: "cursor", instanceState: "working", blockedProbe: "blocked" })).toBe("blocked");
	});

	it("lets the visible prompt outrank the file-derived state for both scraped kinds", () => {
		for (const kind of ["claude", "cursor"] as const) {
			for (const instanceState of ["working", "waiting"] as const) {
				expect(decideAgentFace({ ...base, kind, instanceState, blockedProbe: "blocked" })).toBe("blocked");
			}
		}
	});

	/** The pane is direct evidence, but an untrustworthy scan is still a reason
	 * to admit we do not know WHICH session we are looking at. */
	it("still prefers unknown over amber when the scan itself is untrustworthy", () => {
		expect(decideAgentFace({ ...base, kind: "claude", scanStatus: "unknown", hasCapturedId: false, blockedProbe: "blocked" })).toBe("unknown");
	});
});

describe("An unanswerable approval probe", () => {
	const base = {
		kind: "claude" as const, hasTarget: true, matchCount: 1,
		instanceState: "waiting" as const, scanStatus: "ok" as const,
		hasCapturedId: false, blockedProbe: "clear" as const,
	};

	/** "The terminal could not be read" is not the same answer as "the terminal
	 * showed no prompt". Collapsing the two would paint a blocked Claude as a
	 * calm idle prompt — the exact misreport this state exists to prevent. */
	it("is unknown, never a confident idle or busy face", () => {
		for (const kind of ["claude", "codex", "cursor"] as const) {
			for (const instanceState of ["waiting", "working"] as const) {
				expect(decideAgentFace({ ...base, kind, instanceState, blockedProbe: "failed" })).toBe("unknown");
			}
		}
	});

	it("still reports amber when the probe DID read a prompt", () => {
		expect(decideAgentFace({ ...base, blockedProbe: "blocked" })).toBe("blocked");
	});

	it("cannot conjure a face when there is no session at all", () => {
		expect(decideAgentFace({ ...base, instanceState: null, matchCount: 0, blockedProbe: "failed" })).toBe("none");
	});
});

describe("Agent key face", () => {
	const args = { kind: "cursor" as AgentKind, project: "/Users/j/code/switchboard", host: "tmux" as const, hot: true, state: "working" as const };

	it("never emits hsl() for any kind, state or hot flag — the key rasterizer paints it black", () => {
		for (const kind of KINDS) {
			for (const state of ["none", "working", "blocked", "waiting", "unknown"] as const) {
				for (const hot of [true, false]) {
					for (const host of HOSTS) {
						expect(buildAgentProjectKeyImage({ ...args, kind, state, hot, host })).not.toContain("hsl(");
					}
				}
			}
		}
	});

	it("gives each kind a visibly distinct glyph", () => {
		const faces = KINDS.map((kind) => buildAgentProjectKeyImage({ ...args, kind }));
		expect(new Set(faces).size).toBe(3);
		// The spark, the nested square and the arrow pointer, each drawn twice
		// (state glyph + foot mark) so an idle key still names its agent.
		expect(faces[0]).toContain("M56 12h10"); // claude spark
		expect(faces[0]).toContain("M6.5 64.25h7"); // claude foot mark
		expect(faces[1]).toContain("M56 7h10v10H56z"); // codex nested square
		expect(faces[1]).toContain("M7 61h7v7H7z"); // codex foot mark
		expect(faces[2]).toContain("M57 5l9 10.5"); // cursor arrow
		expect(faces[2]).toContain("M8 61l5 5.8"); // cursor foot mark
	});

	it("gives each state a distinct face and shows the project and host", () => {
		const svg = buildAgentProjectKeyImage(args);
		expect(svg).toContain("switchbo…"); // truncated to fit the key
		expect(svg).toContain("TMUX");
		expect(svg).toContain("#4E9CFF");
		expect(buildAgentProjectKeyImage({ ...args, state: "blocked" })).toContain("#F0A63C");
		expect(buildAgentProjectKeyImage({ ...args, state: "waiting" })).toContain("#F2FFF6");
		expect(buildAgentProjectKeyImage({ ...args, state: "unknown" })).toContain("#8B9490");
		expect(buildAgentProjectKeyImage({ ...args, state: "none" })).toContain("stroke-dasharray");
	});

	it("draws on the shared ink ground and omits the eyebrow when the host is unknown", () => {
		expect(buildAgentProjectKeyImage(args)).toContain('fill="#0F1211"');
		expect(buildAgentProjectKeyImage({ ...args, host: "" })).not.toContain("letter-spacing");
	});

	it("escapes a project name that would otherwise break the SVG", () => {
		for (const kind of KINDS) {
			const svg = buildAgentProjectKeyImage({ ...args, kind, project: "/tmp/a<b&c" });
			expect(svg).toContain("a&lt;b&amp;c");
			expect(svg).not.toContain("a<b&c");
		}
	});

	it("truncates a long project name with an ellipsis", () => {
		expect(buildAgentProjectKeyImage({ ...args, project: "/Users/j/code/absurdly-long-project" }))
			.toContain("absurdly…");
	});

	it("animates only while working", () => {
		for (const kind of KINDS) {
			const frames = new Set([0, 1, 2].map((spin) => buildAgentProjectKeyImage({ ...args, kind, spin })));
			expect(frames.size).toBe(3);
			const idle = new Set([0, 1, 2].map((spin) => buildAgentProjectKeyImage({ ...args, kind, state: "waiting", spin })));
			expect(idle.size).toBe(1);
		}
	});

	/** This unified face replaces the three per-agent keys; it deliberately
	 * carries no deprecation badge of its own. */
	it("carries no deprecation badge", () => {
		for (const kind of KINDS) {
			const svg = buildAgentProjectKeyImage({ ...args, kind });
				// Assert against the ACTUAL fragment: the badge is a bare SVG path,
			// so text-based assertions pass whether or not it is present.
			expect(svg).not.toContain(deprecationBadge());
		}
	});
});
