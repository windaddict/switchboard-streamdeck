import { describe, expect, it } from "vitest";

import { deprecationBadge } from "../src/mac/deprecation.js";
import {
	type AgentHost,
	type AgentInstance,
	type AgentKind,
	agentBindingKey,
	agentForFocusedTty,
	agentTickInteresting,
	type AgentTurnMemory,
	agentUnknownIsAmbiguity,
	blockedEvidenceFor,
	blockedProbeForMissingPane,
	commitIsStale,
	buildAgentProjectKeyImage,
	decideAgentFace,
	initialTurnMemory,
	paneShowsAgentPrompt,
	trackAgentTurn,
	unseenIsActionable,
} from "../src/mac/agent-project.js";

const KINDS: readonly AgentKind[] = ["claude", "codex", "cursor"];
const HOSTS: readonly AgentHost[] = ["tmux", "iterm", "terminal", ""];

/**
 * Claude Code's CHOICE PROMPT — the ENTIRE visible pane of a live AskUserQuestion,
 * from `tmux capture-pane -p` (claude 2.1.236, 2026-08-29). Every line below is
 * byte-for-byte as captured; the only edit is that trailing blank lines were
 * dropped. It is the whole screen, banner included, precisely so the matcher is
 * tested against what it really receives rather than against an idealised excerpt.
 *
 * Module scope, not inside a describe: the cross-function test below reads it from
 * a different describe.
 *
 * The point of the fixture: it carries NEITHER "Do you want to …?" NOR "1. Yes".
 * The question reads "Do you PREFER…" and the first option is "1. Red", so the
 * tool-approval conjunct cannot see it — which is why a blocked Claude painted
 * blue (working) instead of amber.
 */
const CLAUDE_QUESTION = [
	"",
	" ▐▛███▛█   Claude Code v2.1.236",
	"▝▜██████▀  Opus 5 (1M context) with high effort · Claude Max",
	"  ▝▝ ▝▝    ~/code/switchboard",
	"",
	"",
	"❯ Use the AskUserQuestion tool to ask me one question: do I prefer red or blue? Offer exactly those two options. Do nothing else.",
	"────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────",
	" ☐ Color",
	"",
	"Do you prefer red or blue?",
	"",
	"❯ 1. Red",
	"     You prefer red.",
	"  2. Blue",
	"     You prefer blue.",
	"  3. Type something.",
	"────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────",
	"  4. Chat about this",
	"",
	"Enter to select · ↑/↓ to navigate · Esc to cancel",
].join("\n");

/**
 * The three OTHER pickers Claude draws, all captured live in the same scratch
 * session. They exist because the choice-prompt markers are only trustworthy if
 * no NON-blocking picker also carries them — an independent review of the plan
 * rightly refused to accept that on assertion alone.
 *
 * Measured: none carries "Chat about this", and none carries "Enter to select".
 * The trust prompt is the sharpest of the three, because it DOES draw a numbered
 * "1. Yes" list and its footer verb is "confirm", not "select".
 */
const CLAUDE_TRUST_FOOTER = [
	" Accessing workspace:",
	" /private/tmp",
	" Quick safety check: Is this a project you created or one you trust?",
	" ❯ 1. Yes, I trust this folder",
	"   2. No, exit",
	" Enter to confirm · Esc to cancel",
].join("\n");

const CLAUDE_RESUME_PICKER = [
	"  Resume session",
	"  │ ⌕ Search…",
	"  ❯ Show question state in EA system button",
	"    2 seconds ago · main · 1.3MB",
	"  Ctrl+A to show all projects · Ctrl+B to only show current branch · Space to preview · Ctrl+R to rename · Type to search · Esc to cancel",
].join("\n");

const CLAUDE_SLASH_MENU = [
	"  /claude-md-management:revise-claude-md   Update CLAUDE.md with learnings from this session",
	"  /writing-evaluator                       Multi-perspective writing evaluation for business documents.",
	"────────────────────────────────────────",
	"❯ /",
	"  ⏵⏵ auto mode on (shift+tab to cycle)",
].join("\n");

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

/**
 * A4: a failed pane LISTING must not read the same as "no pane matched". This
 * is the pure decision that used to be inline in ai-project.ts's
 * `blockedOnApproval` — pulled out so the honesty rule can be pinned directly
 * rather than only through the action's untested shell.
 */
describe("What a missing pane means for a blocked-probe verdict", () => {
	it("is clear when both list-panes and list-clients failed — indistinguishable from no tmux server", () => {
		for (const kind of KINDS) {
			expect(blockedProbeForMissingPane(kind, false, false)).toBe("clear");
		}
	});

	it("is clear when the panes probe simply succeeded with no match", () => {
		for (const kind of KINDS) {
			expect(blockedProbeForMissingPane(kind, true, true)).toBe("clear");
		}
	});

	/** tmux is demonstrably alive (clientsOk) but the pane listing specifically
	 * broke, so for a kind whose blocked verdict can ONLY come from a pane
	 * scrape, "no pane" here is unanswered, not a clean negative. */
	it("is failed for claude and cursor when panes broke but clients answered", () => {
		for (const kind of ["claude", "cursor"] as const) {
			expect(blockedProbeForMissingPane(kind, false, true)).toBe("failed");
		}
	});

	/** Codex's blocked verdict never depends on a pane at all, so a broken
	 * pane listing changes nothing for it. */
	it("stays clear for codex regardless of which probe failed", () => {
		expect(blockedProbeForMissingPane("codex", false, true)).toBe("clear");
		expect(blockedProbeForMissingPane("codex", false, false)).toBe("clear");
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

	/** THE REGRESSION. A blocked Claude showing a question — not a tool approval —
	 * must read as blocked. Measured: with `--permission-mode auto` the approvals
	 * auto-accept, so questions are the prompts that actually hold the operator. */
	it("matches Claude's choice prompt, which carries neither approval marker", () => {
		expect(CLAUDE_QUESTION).not.toContain("Do you want to");
		expect(CLAUDE_QUESTION).not.toContain("1. Yes");
		expect(paneShowsAgentPrompt("claude", CLAUDE_QUESTION)).toBe(true);
	});

	/** Each marker alone is ordinary text. All three are required together. */
	it("does not fire on any single choice marker alone", () => {
		expect(paneShowsAgentPrompt("claude", "Press Enter to select a file from the list")).toBe(false);
		expect(paneShowsAgentPrompt("claude", "The dialog closed. Esc to cancel was shown in the footer.")).toBe(false);
		expect(paneShowsAgentPrompt("claude", "4. Chat about this")).toBe(false);
	});

	/** ALL THREE two-of-three combinations, so no future edit can quietly drop one
	 * marker and stay green. Each of these would pass a two-marker implementation. */
	it("does not fire on any two of the three markers", () => {
		// footer pair, no discriminator
		expect(paneShowsAgentPrompt("claude", "Enter to select · ↑/↓ to navigate · Esc to cancel")).toBe(false);
		// discriminator + "Enter to select", no "Esc to cancel"
		expect(paneShowsAgentPrompt("claude", "  4. Chat about this\nEnter to select · ↑/↓ to navigate")).toBe(false);
		// discriminator + "Esc to cancel", no "Enter to select"
		expect(paneShowsAgentPrompt("claude", "  4. Chat about this\nEnter to confirm · Esc to cancel")).toBe(false);
	});

	/** All three PHRASES present, but as prose rather than as a live prompt. This is
	 * the residual the function's doc comment warns about, and the anchoring is what
	 * holds it: the footer must be one line carrying both halves, and the
	 * discriminator must be a numbered option line. */
	it("does not fire when all three phrases appear as ordinary prose", () => {
		const prose = [
			"The picker footer reads Enter to select and then Esc to cancel,",
			"and the last option is always Chat about this — see the docs.",
		].join("\n");
		expect(prose).toContain("Enter to select");
		expect(prose).toContain("Esc to cancel");
		expect(prose).toContain("Chat about this");
		expect(paneShowsAgentPrompt("claude", prose)).toBe(false);
	});

	/** Claude's other pickers, from real captures. The operator is already
	 * interacting in all three; none is the agent waiting on a decision. */
	it("does not fire on Claude's trust, resume or slash-command pickers", () => {
		expect(paneShowsAgentPrompt("claude", CLAUDE_TRUST_FOOTER)).toBe(false);
		expect(paneShowsAgentPrompt("claude", CLAUDE_RESUME_PICKER)).toBe(false);
		expect(paneShowsAgentPrompt("claude", CLAUDE_SLASH_MENU)).toBe(false);
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
		for (const text of [CLAUDE_BASH, CLAUDE_EDIT, CLAUDE_QUESTION, "Waiting for approval", "Run this command?\nRun (once)", ""]) {
			expect(paneShowsAgentPrompt("codex", text)).toBe(false);
		}
	});
});

/**
 * The measured regression, end to end through the pure layer: the exact data flow
 * `src/actions/ai-project.ts` uses (line 298 turns the pane text into a probe,
 * which decideAgentFace then composes).
 *
 * Both instance states are asserted deliberately. A blocked Claude keeps its idle
 * "✳" title, so it arrives here as `waiting`; the transcript heuristic can also
 * call it `working`. The prompt on screen must win from EITHER.
 */
describe("A Claude question read end-to-end through the pure layer", () => {
	const probeFor = (text: string) => (paneShowsAgentPrompt("claude", text) ? "blocked" : "clear") as const;

	it.each(["working", "waiting"] as const)("paints blocked from instanceState %s", (instanceState) => {
		expect(
			decideAgentFace({
				kind: "claude",
				hasTarget: true,
				matchCount: 1,
				instanceState,
				scanStatus: "ok",
				hasCapturedId: false,
				blockedProbe: probeFor(CLAUDE_QUESTION),
			}),
		).toBe("blocked");
	});

	/** The other side of it: an ordinary picker must leave the face alone. */
	it("leaves the resume picker reading as its own state", () => {
		expect(
			decideAgentFace({
				kind: "claude",
				hasTarget: true,
				matchCount: 1,
				instanceState: "working",
				scanStatus: "ok",
				hasCapturedId: false,
				blockedProbe: probeFor(CLAUDE_RESUME_PICKER),
			}),
		).toBe("working");
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
						for (const unseen of [true, false]) {
							expect(buildAgentProjectKeyImage({ ...args, kind, state, hot, host, unseen })).not.toContain("hsl(");
						}
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

describe("The unread mark on the key face", () => {
	const args = { kind: "claude" as AgentKind, project: "/Users/j/code/switchboard", host: "tmux" as const, hot: false, state: "waiting" as const };
	const STRIPE = '<rect x="0" y="0" width="4" height="57" fill="#FF4A4A"/>';

	it("draws the stripe only when asked", () => {
		for (const kind of KINDS) {
			expect(buildAgentProjectKeyImage({ ...args, kind, unseen: true })).toContain(STRIPE);
			expect(buildAgentProjectKeyImage({ ...args, kind, unseen: false })).not.toContain("#FF4A4A");
			expect(buildAgentProjectKeyImage({ ...args, kind })).not.toContain("#FF4A4A");
		}
	});

	/**
	 * The mark is a LAYER, not a state colour: the face underneath must go on
	 * saying what the session is doing. Asserting the state colour is still
	 * PRESENT would not show that — the whole face could have changed around
	 * it. This asserts the marked face is byte-for-byte the unmarked one with
	 * the stripe appended, which is the actual claim.
	 */
	it("changes nothing on the face except adding the stripe", () => {
		for (const kind of KINDS) {
			for (const state of ["working", "blocked", "waiting", "unknown", "none"] as const) {
				for (const hot of [true, false]) {
					const plain = buildAgentProjectKeyImage({ ...args, kind, state, hot });
					const marked = buildAgentProjectKeyImage({ ...args, kind, state, hot, unseen: true });
					expect(marked).toBe(plain.replace("</svg>", `${STRIPE}</svg>`));
				}
			}
		}
	});

	/** The foot bar means "your keystrokes reach this session", which is the
	 * exact condition under which the mark cannot be showing. The stripe stops
	 * at y=57 so the two never touch. */
	it("stops short of the foot bar", () => {
		expect(STRIPE).toContain('height="57"');
		const svg = buildAgentProjectKeyImage({ ...args, hot: true, unseen: true });
		expect(svg).toContain('y="57"'); // the hot bar's own top edge
		expect(svg).toContain(STRIPE);
	});

	it("is painted last, so nothing can overdraw it", () => {
		const svg = buildAgentProjectKeyImage({ ...args, unseen: true });
		expect(svg.indexOf(STRIPE)).toBeGreaterThan(svg.indexOf("switchbo…"));
		expect(svg.endsWith(`${STRIPE}</svg>`)).toBe(true);
	});
});

describe("Whether the AI Project poller should stay at full cadence (F7)", () => {
	const idle = (kind: AgentKind, tty: string): AgentInstance =>
		({ kind, pid: 1, tty, cwd: "/Users/j/code/app", sessionId: "", state: "waiting" });
	const working = (kind: AgentKind, tty: string): AgentInstance =>
		({ kind, pid: 1, tty, cwd: "/Users/j/code/app", sessionId: "", state: "working" });
	const blocked = (kind: AgentKind, tty: string): AgentInstance =>
		({ kind, pid: 1, tty, cwd: "/Users/j/code/app", sessionId: "", state: "blocked" });

	it("stays interesting whenever a terminal is focused", () => {
		expect(agentTickInteresting({ focusedTty: "/dev/ttys001", instances: [], blockedProbes: [], unseenActionable: false })).toBe(true);
	});

	it("stays interesting when any instance is working", () => {
		expect(agentTickInteresting({
			focusedTty: "", instances: [working("codex", "/dev/ttys001")], blockedProbes: ["clear"], unseenActionable: false,
		})).toBe(true);
	});

	it("stays interesting for a working (or blocked) codex instance", () => {
		expect(agentTickInteresting({
			focusedTty: "", instances: [blocked("codex", "/dev/ttys001")], blockedProbes: ["clear"], unseenActionable: false,
		})).toBe(true);
	});

	/**
	 * THE F7 REGRESSION TEST. Claude Code keeps its idle "✳" title while its
	 * own approval prompt is up (measured), so a blocked Claude's instance
	 * state reads `"waiting"` — never `"working"` or `"blocked"`. A version of
	 * this function that only consulted instance state would drop the poller
	 * to a quarter cadence at exactly the moment the operator's attention is
	 * most needed. Folding in the tick's own blocked-probe verdicts closes
	 * that gap.
	 */
	it("keeps full cadence for a blocked Claude even though its instance state reads waiting", () => {
		expect(agentTickInteresting({
			focusedTty: "",
			instances: [idle("claude", "/dev/ttys001")],
			blockedProbes: ["blocked"], unseenActionable: false,
		})).toBe(true);
	});

	it("keeps full cadence when any probe failed, so a broken probe gets retried promptly", () => {
		expect(agentTickInteresting({
			focusedTty: "",
			instances: [idle("claude", "/dev/ttys001")],
			blockedProbes: ["failed"], unseenActionable: false,
		})).toBe(true);
	});

	it("drops to the idle gate only when nothing is focused, working, blocked, or unanswered", () => {
		expect(agentTickInteresting({
			focusedTty: "",
			instances: [idle("claude", "/dev/ttys001"), idle("cursor", "/dev/ttys002")],
			blockedProbes: ["clear", "clear"], unseenActionable: false,
		})).toBe(false);
		expect(agentTickInteresting({ focusedTty: "", instances: [], blockedProbes: [], unseenActionable: false })).toBe(false);
	});
});

describe("The unread mark's memory", () => {
	const BIND = agentBindingKey("claude", "/Users/j/code/app", "");
	const start = (): AgentTurnMemory => initialTurnMemory(BIND);

	/** Feed a sequence of [face, hot] observations through one memory. */
	/** Every step defaults to pid 1 — ONE steady process — so a test only has to
	 * say `pid` when the point is that the process changed. */
	const run = (
		steps: ReadonlyArray<readonly [AgentState, boolean] | readonly [AgentState, boolean, { ambiguous?: boolean; binding?: string; pid?: number }]>,
		from: AgentTurnMemory = start(),
	): AgentTurnMemory =>
		steps.reduce<AgentTurnMemory>((memory, [face, hot, opts]) => trackAgentTurn(memory, {
			binding: opts?.binding ?? BIND,
			face,
			hot,
			ambiguous: opts?.ambiguous ?? false,
			pid: opts?.pid ?? (face === "none" || face === "unknown" ? 0 : 1),
		}), from);

	/**
	 * COLD START, and the reason the memory carries `sawActivity` at all. A key
	 * that appears beside an agent already sitting at an idle prompt has watched
	 * no transition, so it has nothing to report. This is structural — there is
	 * no "first tick" special case to forget.
	 */
	it("cannot mark a turn unread when it never saw one run", () => {
		expect(run([["waiting", false]]).unseen).toBe(false);
		expect(run([["waiting", false], ["waiting", false], ["waiting", false]]).unseen).toBe(false);
		expect(run([["unknown", false], ["waiting", false]]).unseen).toBe(false);
	});

	it("marks a turn unread when it finishes while the operator is elsewhere", () => {
		expect(run([["working", false], ["waiting", false]]).unseen).toBe(true);
	});

	/** Watching a turn START is not seeing its RESULT — the operator switched
	 * away before it finished, which is exactly the case this feature exists for. */
	it("marks a turn unread even though the operator watched it start", () => {
		expect(run([["working", true], ["working", false], ["waiting", false]]).unseen).toBe(true);
	});

	it("does not mark a turn unread when it finishes with the operator right there", () => {
		expect(run([["working", false], ["waiting", true]]).unseen).toBe(false);
	});

	it("clears the mark as soon as the key goes hot", () => {
		const armed = run([["working", false], ["waiting", false]]);
		expect(armed.unseen).toBe(true);
		expect(run([["waiting", true]], armed).unseen).toBe(false);
	});

	/** Dismissal must not depend on the tick being able to see anything. If the
	 * operator is demonstrably at the terminal, the mark is answered whatever
	 * the probes managed to say this time round. */
	it("clears the mark on a hot tick even when the face is unknown", () => {
		const armed = run([["working", false], ["waiting", false]]);
		expect(run([["unknown", true]], armed).unseen).toBe(false);
	});

	/**
	 * F002 OF THE PLAN REVIEW. `unknown` from a failed probe means "we could not
	 * look this tick", not "nothing happened". Forgetting the memory there would
	 * let one transient tmux hiccup swallow the notification entirely.
	 */
	it("carries the memory through an unknown caused by a probe that could not answer", () => {
		expect(run([["working", false], ["unknown", false], ["unknown", false], ["waiting", false]]).unseen).toBe(true);
	});

	it("keeps an armed mark alive across an unanswerable tick", () => {
		const armed = run([["working", false], ["waiting", false]]);
		expect(run([["unknown", false], ["waiting", false]], armed).unseen).toBe(true);
	});

	/**
	 * THE OTHER HALF OF F002, and the one that would have shipped a lie.
	 * `unknown` also means "two live sessions match this folder" — reachable in
	 * normal use, because Claude Code exposes no session id. Activity credited
	 * to the key before the ambiguity may belong to the OTHER session, so when
	 * one of them exits the survivor must not inherit a completion it never made.
	 */
	it("forgets the memory when it can no longer tell which session the key watches", () => {
		expect(run([
			["working", false],
			["unknown", false, { ambiguous: true }],
			["waiting", false],
		]).unseen).toBe(false);
	});

	it("drops an already-armed mark when the target becomes ambiguous", () => {
		const armed = run([["working", false], ["waiting", false]]);
		expect(run([["unknown", false, { ambiguous: true }]], armed).unseen).toBe(false);
	});

	/** OPERATOR DECISION (2026-08-23): a new turn supersedes the previous
	 * result, so the key shows plain blue while working and re-marks when that
	 * turn ends. The documented guarantee is therefore about the MOST RECENT
	 * completed turn, not about every result ever produced. */
	it("clears the mark when the agent starts a new turn", () => {
		const armed = run([["working", false], ["waiting", false]]);
		expect(run([["working", false]], armed).unseen).toBe(false);
		expect(run([["working", false], ["waiting", false]], armed).unseen).toBe(true);
	});

	/**
	 * F004 OF THE PLAN REVIEW. A blocked agent is by definition NOT working, so
	 * `blocked` must never manufacture the evidence that a turn ran. Two ways
	 * this fires without any work: the operator dismisses an approval prompt
	 * with Esc, or the pane scrape matches prompt-like text in ordinary output.
	 * Either way the face returns to `waiting` with nothing accomplished.
	 */
	it("does not mark a turn unread when an approval prompt merely came and went", () => {
		expect(run([["blocked", false], ["waiting", false]]).unseen).toBe(false);
	});

	/** But a turn that ran, stopped for approval, and then finished IS a
	 * completed turn — blocked preserves the evidence it must not create. */
	it("marks a turn unread when work paused for approval and then finished", () => {
		expect(run([["working", false], ["blocked", false], ["waiting", false]]).unseen).toBe(true);
	});

	it("clears the mark when the agent reaches an approval prompt, because a turn is running again", () => {
		const armed = run([["working", false], ["waiting", false]]);
		expect(run([["blocked", false]], armed).unseen).toBe(false);
	});

	/** A mark on a dead session could never be dismissed — pressing the key
	 * raises nothing — so it must not survive the session's exit, and the next
	 * session to appear in that folder starts cold. */
	it("forgets everything when the session exits", () => {
		expect(run([["working", false], ["none", false]])).toEqual(initialTurnMemory(BIND));
		expect(run([["working", false], ["none", false], ["waiting", false]]).unseen).toBe(false);
	});

	it("spends the evidence, so one finished turn cannot re-arm on later idle ticks", () => {
		const armed = run([["working", false], ["waiting", false]]);
		expect(armed).toEqual({ binding: BIND, instancePid: 1, sawActivity: false, unseen: true });
		const later = run([["waiting", false], ["waiting", false]], armed);
		expect(later).toEqual({ binding: BIND, instancePid: 1, sawActivity: false, unseen: true });
		expect(run([["waiting", true], ["waiting", false]], armed).unseen).toBe(false);
	});

	/**
	 * F003 OF THE PLAN REVIEW — the concurrency guarantee, expressed purely.
	 * A refresh pass reads settings, spends several hundred milliseconds
	 * probing, and only then commits. If the operator re-teaches the key in
	 * that window, the pass arrives carrying the OLD binding. Comparing the
	 * binding is what makes that commit harmless with no lock anywhere.
	 */
	it("starts over rather than merging when the commit describes a different target", () => {
		const armed = run([["working", false], ["waiting", false]]);
		const other = agentBindingKey("codex", "/Users/j/code/other", "sess-1");
		expect(trackAgentTurn(armed, { binding: other, face: "waiting", hot: false, ambiguous: false, pid: 1 }))
			.toEqual({ binding: other, instancePid: 1, sawActivity: false, unseen: false });
	});

	it("does not let a re-taught key inherit the previous target's finished turn", () => {
		const armed = run([["working", false], ["waiting", false]]);
		const other = agentBindingKey("cursor", "/Users/j/code/other", "sess-9");
		expect(run([["waiting", false, { binding: other }], ["waiting", false, { binding: other }]], armed).unseen)
			.toBe(false);
	});

	/**
	 * F003 OF THE DIFF REVIEW, and the reason the memory carries a pid at all.
	 * Claude Code has no session id, so it binds by project path only: a
	 * session that exits and a different Claude started in the same folder are
	 * one binding. If a scan failure hides the swap — and a failed scan
	 * deliberately preserves the memory — the first session's unfinished turn
	 * would be handed to whichever Claude was sitting idle afterwards.
	 */
	it("does not hand one Claude session's unfinished turn to its replacement", () => {
		expect(run([
			["working", false, { pid: 4001 }],
			["unknown", false],
			["waiting", false, { pid: 4002 }],
		]).unseen).toBe(false);
	});

	it("drops an armed mark when the session behind it was replaced", () => {
		const armed = run([["working", false, { pid: 4001 }], ["waiting", false, { pid: 4001 }]]);
		expect(armed.unseen).toBe(true);
		expect(run([["waiting", false, { pid: 4002 }]], armed).unseen).toBe(false);
	});

	/** A tick that selected nothing reports pid 0. That is silence — the probe
	 * could not see the session — and must not read as "the process changed",
	 * or every unreadable tick would wipe the memory it is meant to protect. */
	it("treats a tick that selected no session as silence, not as a new process", () => {
		expect(run([
			["working", false, { pid: 4001 }],
			["unknown", false, { pid: 0 }],
			["unknown", false, { pid: 0 }],
			["waiting", false, { pid: 4001 }],
		]).unseen).toBe(true);
	});

	it("remembers the pid across unreadable ticks so a later swap is still caught", () => {
		expect(run([
			["working", false, { pid: 4001 }],
			["unknown", false, { pid: 0 }],
			["waiting", false, { pid: 4002 }],
		]).unseen).toBe(false);
	});

	it("keys the binding on all three parts of what a key targets", () => {
		expect(agentBindingKey("claude", "/a", "")).not.toBe(agentBindingKey("codex", "/a", ""));
		expect(agentBindingKey("claude", "/a", "")).not.toBe(agentBindingKey("claude", "/b", ""));
		expect(agentBindingKey("codex", "/a", "s1")).not.toBe(agentBindingKey("codex", "/a", "s2"));
		expect(agentBindingKey(undefined, "", "")).toBe(agentBindingKey(undefined, "", ""));
	});
});

describe("Which unknown face means the key lost track of its session", () => {
	const args = { scanStatus: "ok" as const, hasCapturedId: false, instanceSelected: false, matchCount: 2 };

	/** Mirrors decideAgentFace's matchCount > 1 branch exactly. */
	it("calls it ambiguity when a trustworthy scan found several unnameable sessions", () => {
		expect(agentUnknownIsAmbiguity(args)).toBe(true);
	});

	it("does not call it ambiguity when the scan itself could not be trusted", () => {
		expect(agentUnknownIsAmbiguity({ ...args, scanStatus: "unknown" })).toBe(false);
	});

	/** A captured session id IS the disambiguator, so neighbours in the folder
	 * are irrelevant — the key knows precisely which session is its own. */
	it("does not call it ambiguity when the key captured a session id", () => {
		expect(agentUnknownIsAmbiguity({ ...args, hasCapturedId: true })).toBe(false);
	});

	it("does not call it ambiguity when a session was selected, or when only one matched", () => {
		expect(agentUnknownIsAmbiguity({ ...args, instanceSelected: true })).toBe(false);
		expect(agentUnknownIsAmbiguity({ ...args, matchCount: 1 })).toBe(false);
		expect(agentUnknownIsAmbiguity({ ...args, matchCount: 0 })).toBe(false);
	});
});

describe("When an unread mark deserves the full poll cadence", () => {
	const armed: AgentTurnMemory = { binding: "b", instancePid: 1, sawActivity: false, unseen: true };

	/** Dismissal is what the cadence buys: without it the poller can sit at a
	 * quarter rate while the operator walks over to the session, leaving the
	 * mark showing for up to a further ~10s after it stopped being true. */
	it("holds full cadence for a mark the operator could dismiss right now", () => {
		expect(unseenIsActionable(armed, "waiting")).toBe(true);
	});

	/**
	 * F006 OF THE PLAN REVIEW. A mark carried across an unknown face is
	 * remembered history about a target we currently cannot see. Letting it
	 * hold the cadence would mean one persistently broken probe pins every
	 * visible key at 2.5s for as long as it stays broken.
	 */
	it("does not hold full cadence for a mark on a face we could not read", () => {
		expect(unseenIsActionable(armed, "unknown")).toBe(false);
	});

	it("holds nothing when there is no mark", () => {
		expect(unseenIsActionable({ binding: "b", instancePid: 1, sawActivity: true, unseen: false }, "waiting")).toBe(false);
	});

	it("feeds the cadence gate: an actionable mark alone keeps the poller awake", () => {
		expect(agentTickInteresting({
			focusedTty: "", instances: [], blockedProbes: ["clear"], unseenActionable: true,
		})).toBe(true);
		expect(agentTickInteresting({
			focusedTty: "", instances: [], blockedProbes: ["clear"], unseenActionable: false,
		})).toBe(false);
	});
});

describe("Whether a refresh pass should throw away what it computed for a key", () => {
	/**
	 * The pass reads a key's settings, spends several hundred milliseconds
	 * probing, and only then commits. Anything that happened in between makes
	 * the result worthless rather than merely late.
	 */
	it("commits when the key is still there and nothing was pressed", () => {
		expect(commitIsStale({ stillVisible: true, genAtRead: 3, genNow: 3 })).toBe(false);
	});

	/** A capture or a successful raise bumps the generation. Both mean the
	 * operator has already moved past whatever this pass observed. */
	it("throws the result away when a press landed during the pass", () => {
		expect(commitIsStale({ stillVisible: true, genAtRead: 3, genNow: 4 })).toBe(true);
	});

	/** Committing for a key that has gone would leave state behind for a key
	 * nobody can see. */
	it("throws the result away when the key disappeared during the pass", () => {
		expect(commitIsStale({ stillVisible: false, genAtRead: 3, genNow: 3 })).toBe(true);
		expect(commitIsStale({ stillVisible: false, genAtRead: 3, genNow: 9 })).toBe(true);
	});
});
