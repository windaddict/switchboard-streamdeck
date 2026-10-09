/**
 * WHAT IT'S FOR: one shared decision layer for the "agent project" keys, so a
 * key that has captured a Claude Code, Codex or Cursor session in a folder can
 * answer the same four questions — is there a session, is it working, is it
 * blocked on me, or is it just sitting idle? — with the SAME rules whichever
 * CLI it captured. Before this module each CLI had its own copy of that logic
 * and the copies had drifted; the drift is what this module removes.
 *
 * The three CLIs are NOT interchangeable underneath, and the differences are
 * load-bearing rather than cosmetic. Each was measured against a live session,
 * and the comments below say what was observed rather than what seemed likely:
 *
 *   - Codex records "I am waiting for your approval" in its own rollout log, so
 *     a blocked Codex session is knowable from a file, on any host, with no
 *     terminal scraping at all. Its `state` already carries `blocked`.
 *   - Claude Code and Cursor write nothing that distinguishes "blocked on the
 *     operator" from "busy working". The ONLY direct evidence is the prompt
 *     drawn on the terminal — for Claude that is EITHER a tool approval OR a
 *     choice prompt (a question, or a plan awaiting approval), which share no
 *     wording — and the only terminal this plugin can read is a tmux pane. Outside tmux, "blocked" is simply not observable for
 *     those two — see {@link blockedEvidenceFor}.
 *   - Measured, and the reason {@link decideAgentFace} exists in this form:
 *     Claude Code keeps its IDLE title marker (a "✳") on screen while its
 *     approval prompt is up, so a blocked Claude session's file-derived state
 *     reads `waiting`, not `working`. Cursor's blocked session has no
 *     `turn_ended` record yet and so reads `working`. A rule that only upgrades
 *     a `working` session to `blocked` is therefore correct for Cursor and
 *     unreachable for Claude.
 *
 * Vocabulary used throughout (these recur, so they are defined once here):
 *   - "instance" — one running agent process this plugin has identified,
 *     with the tty it owns and the folder it was started in. Identifying them
 *     is the impure scanners' job; this module only decides.
 *   - "face" — what the key should PAINT: the composed verdict, which is not
 *     the same thing as an instance's own state (an incomplete scan can force
 *     `unknown` over a perfectly confident instance).
 *   - "hot" — this key's project is the one the operator is looking at now.
 *   - "unseen" — a turn was observed WORKING and later observed finished while the
 *     key was not hot, and the key has not been hot since. Its role is the deck's
 *     unread mark: it answers "did something finish while I was looking elsewhere?",
 *     which no single-tick face can answer. It is memory, not an observation, so it
 *     is armed only by a transition this plugin actually watched happen — a key that
 *     first appears next to an already-idle agent can never claim one.
 */

import { normalizeProjectPath } from "./codex-project.js";
import { hslToHex } from "./svg.js";
import { escapeXml, sessionHue } from "./tmux-window.js";

/** Which agent CLI a key captured. */
export type AgentKind = "claude" | "codex" | "cursor";

/**
 * `none` no such session; `working` a turn is in flight; `blocked` the agent is
 * holding for operator input — an approval, or an answer to a question it asked;
 * `waiting` the turn ended and the prompt
 * is idle; `unknown` a probe failed or several sessions match and we refuse to
 * guess.
 */
export type AgentState = "none" | "working" | "blocked" | "waiting" | "unknown";

/** Where the session's terminal lives. "" means "not established yet". */
export type AgentHost = "tmux" | "iterm" | "terminal" | "";

/**
 * How trustworthy a "blocked" verdict can be for this kind+host.
 *
 * - `authoritative` — the agent itself records that it is blocked, so the
 *   verdict comes from the agent's own log and holds on any host.
 * - `terminal` — blocked can only be read by scraping the terminal's visible
 *   screen for a known prompt. Correct when the wording is one we recognise,
 *   and silently absent when it is not.
 * - `unavailable` — nothing this plugin can read distinguishes blocked from
 *   working here. A key in this situation will show `working` for a blocked
 *   session; that is a known blind spot, not a bug to be papered over.
 */
export type BlockedEvidence = "authoritative" | "terminal" | "unavailable";

export interface AgentInstance {
	kind: AgentKind;
	pid: number;
	/** Controlling tty, always normalised to the "/dev/ttysNNN" device path
	 * (tmux and `ps` disagree on the short/long form; callers normalise before
	 * constructing an instance so comparisons here are plain string equality). */
	tty: string;
	/** The process's working directory = the project the key targets. */
	cwd: string;
	/** Session identity where the CLI has one; "" for claude, which this plugin
	 * binds by project path only (it exposes no per-session id a key can hold). */
	sessionId: string;
	state: Exclude<AgentState, "none">;
}

/**
 * What kind of evidence a `blocked` verdict could rest on for this kind+host.
 *
 * Callers use it to decide whether scraping a pane is worth doing at all, and
 * to avoid promising a "needs you" light they cannot actually deliver.
 */
export function blockedEvidenceFor(kind: AgentKind, host: AgentHost): BlockedEvidence {
	// Codex reports blocking in its own rollout log, so it needs no terminal and
	// works outside tmux too.
	if (kind === "codex") return "authoritative";
	// Claude and Cursor are only observable through the pane text, and the only
	// terminal this plugin can read is a tmux pane.
	return host === "tmux" ? "terminal" : "unavailable";
}

/**
 * What should a "blocked" probe read when there is no pane to scrape?
 *
 * A missing pane is ambiguous on its own: it means "no session here" just as
 * often as it means "the pane LISTING itself failed this tick". The two must
 * not paint the same face. `panesOk` tells them apart:
 *
 *   - Both `list-panes` and `list-clients` failed: indistinguishable from a
 *     machine with no tmux server at all, which is a supported first-class
 *     case (`runTmux` reports that failure the same way it reports "no tmux
 *     server"). The honest answer here is `"clear"` — there was never a
 *     question to answer.
 *   - `list-clients` succeeded but `list-panes` specifically did not: tmux is
 *     demonstrably alive, so a hidden approval prompt cannot be ruled out for
 *     any kind whose blocked verdict can ONLY come from scraping a pane
 *     (`blockedEvidenceFor(kind, "tmux") === "terminal"` — claude and cursor).
 *     For those, "clear" would be a confident negative on a question that was
 *     never actually asked; the honest answer is `"failed"`. Codex is
 *     unaffected either way — its blocked verdict never depends on a pane.
 */
export function blockedProbeForMissingPane(
	kind: AgentKind,
	panesOk: boolean,
	clientsOk: boolean,
): "clear" | "failed" {
	if (!panesOk && clientsOk && blockedEvidenceFor(kind, "tmux") === "terminal") return "failed";
	return "clear";
}

/** Claude Code's approval question. Two different wordings were measured —
 * "Do you want to proceed?" for a bash approval and "Do you want to make this
 * edit to <file>?" for an edit approval — so the matcher keys on the shared
 * stem rather than on either full sentence. `.` does not cross newlines, so
 * this necessarily matches WITHIN one line of pane text. */
const CLAUDE_ASK = /Do you want to .*\?/;

/**
 * Claude Code's OTHER way of blocking on you: the choice prompt it draws for
 * `AskUserQuestion` — and, on inference from the CLI binary's strings rather
 * than any live capture, for plan approval.
 *
 * This is a second, disjoint shape, not a variation on the approval wording.
 * Measured (claude 2.1.236, tmux, 2026-08-29, two independent captures): the
 * question can read "Do you PREFER red or blue?" and the first option can be
 * "1. Red", so {@link CLAUDE_ASK} and the "1. Yes" choice line both miss it
 * entirely. It matters more than it sounds: under `--permission-mode auto` the
 * tool approvals auto-accept, so a question is often the ONLY thing that still
 * stops the operator — and it was painting the key blue (working).
 *
 * Both patterns are LINE-ANCHORED, and that is the point. Three bare substrings
 * anywhere in the pane would match a README, a test log or a docs page that
 * merely discusses the prompt; requiring the footer's two halves on ONE line and
 * the discriminator as a NUMBERED OPTION line ties the match to the prompt's
 * actual layout. It narrows a real false-amber path rather than only documenting
 * it. A test pins the prose case.
 *
 * "Chat about this" is the discriminator: it is what separates a prompt AWAITING
 * A DECISION from Claude's other selectable lists, where the operator is already
 * interacting. All three of those were captured on the same day and none carries
 * it, nor the "Enter to select" footer:
 *
 *   - folder-trust prompt — footer "Enter to confirm · Esc to cancel". The verb
 *     is CONFIRM, not select. This is the sharp one: it also draws a numbered
 *     "1. Yes" list, so it is the closest thing to a false positive on the deck.
 *   - `--resume` session picker — footer "… Type to search · Esc to cancel".
 *   - slash-command menu — no footer of this shape at all.
 *
 * FAILURE DIRECTION, deliberately chosen and unchanged from the approval matcher:
 * if a future release rewraps the footer onto two lines or renumbers the option,
 * these stop matching and amber stops APPEARING. They do not start lying.
 */
const CLAUDE_CHOICE_FOOTER = /^\s*Enter to select\b.*\bEsc to cancel\s*$/m;
const CLAUDE_CHOICE_OPTION = /^\s*\d+\.\s+Chat about this\s*$/m;

/**
 * Does this terminal pane show the agent holding for the operator right now?
 *
 * "Holding" is broader than an approval. For Claude Code it is EITHER a tool
 * approval OR a choice prompt — a question, or a plan awaiting approval — and
 * the two share no wording, so each is matched separately. Under
 * `--permission-mode auto` the approvals auto-accept and the choice prompt is
 * the one that actually stops the operator.
 *
 * Matching is deliberately narrow, and the guarantee is narrow to match:
 * unrecognised wording yields false, so a prompt phrased in a way we have not
 * measured leaves the key on its file-derived state instead of inventing an
 * amber light. It does NOT guarantee the reverse — this reads the pane's
 * visible text, so recognised prompt wording appearing in ordinary output (a
 * README being catted, a transcript being replayed) CAN produce a false
 * `blocked`. The markers below were chosen to make that unlikely, not
 * impossible.
 *
 * Callers must capture the VISIBLE screen only, never scrollback: an
 * already-answered prompt lingers in history, and matching it would hold the
 * key amber while the agent is busy working.
 */
export function paneShowsAgentPrompt(kind: AgentKind, paneText: string): boolean {
	switch (kind) {
		case "codex":
			// Codex's own log already says `blocked` (see blockedEvidenceFor), so
			// there is nothing to gain by scraping and a false positive to lose.
			return false;
		case "claude": {
			// TWO disjoint shapes, because Claude blocks on you in two different
			// ways and they share no wording. Either one is enough.
			//
			// (a) The TOOL APPROVAL. The question alone is too ordinary a sentence
			// to trust; Claude renders a numbered choice list directly beneath it,
			// and both measured wordings carry "1. Yes".
			//
			// NEGATIVE CASE (measured): the folder-trust prompt — "Quick safety
			// check: Is this a project you created or one you trust?" with "1. Yes,
			// I trust this folder" — carries the same choice line but is NOT an
			// approval to act on, and must not turn the key amber. It is excluded by
			// the question stem: it never says "Do you want to". A test pins this.
			if (CLAUDE_ASK.test(paneText) && paneText.includes("1. Yes")) return true;
			// (b) The CHOICE PROMPT — a question, or (inferred) a plan awaiting
			// approval. See {@link CLAUDE_CHOICE_FOOTER} for why both are anchored to
			// their lines and which non-blocking pickers were measured against them.
			return CLAUDE_CHOICE_FOOTER.test(paneText) && CLAUDE_CHOICE_OPTION.test(paneText);
		}
		case "cursor":
			// The inline status marker is specific enough to stand on its own.
			// "Run this command?" is a phrase that could plausibly appear in
			// scrolled output, so it only counts alongside Cursor's choice line.
			if (paneText.includes("Waiting for approval")) return true;
			return paneText.includes("Run this command?") && paneText.includes("Run (once)");
	}
}

/**
 * The agent instance owning the terminal the operator is looking at, or null.
 *
 * Returns null on zero matches AND on two or more — never picks. Two can
 * genuinely match: an agent launched from inside another agent's terminal
 * inherits that terminal's tty, so both processes legitimately report it.
 * Choosing between them would be a guess, and the caller's honest answer to a
 * guess is to show nothing rather than act on the wrong session.
 */
export function agentForFocusedTty(
	instances: readonly AgentInstance[],
	focusedTty: string,
): AgentInstance | null {
	const matches = instances.filter((i) => i.tty === focusedTty);
	return matches.length === 1 ? matches[0] : null;
}

/**
 * Should the AI Project key's poller stay at full cadence this tick, or is it
 * safe to drop to the idle-gate's reduced rate?
 *
 * MEASURED, and the reason `blockedProbes` is part of this decision and not
 * just `instances`: Claude Code keeps its idle "✳" title marker on screen
 * while its own approval prompt is up, so a BLOCKED Claude's `instance.state`
 * reads `"waiting"`, never `"working"` or `"blocked"` — a version of this
 * check that only looked at instance state would drop to a quarter of full
 * cadence at exactly the moment the operator's approval is most time-
 * sensitive, and the amber light could sit stale for up to 4 poll periods
 * (~10s) instead of one (~2.5s). Folding in every kind's own blocked-probe
 * verdict for the tick closes that gap for every kind, not just Claude.
 * `"failed"` counts as interesting too, so a broken probe is re-tried at full
 * speed rather than quietly left broken for several cycles.
 */
export function agentTickInteresting(args: {
	focusedTty: string;
	instances: readonly AgentInstance[];
	blockedProbes: ReadonlyArray<"clear" | "blocked" | "failed">;
	/** Any visible key showing a DISMISSIBLE unread mark ({@link unseenIsActionable}).
	 * Without this the idle gate would drop to a quarter cadence exactly while a
	 * mark is waiting to be dismissed, so going to the session would leave the
	 * key claiming "unread" for up to a further ~10s — the mark lying. Required
	 * rather than optional so every caller has to answer it. */
	unseenActionable: boolean;
}): boolean {
	return (
		args.focusedTty !== "" ||
		args.instances.some((i) => i.state === "working" || i.state === "blocked") ||
		args.blockedProbes.some((p) => p !== "clear") ||
		args.unseenActionable
	);
}

/**
 * Compose the face a key should paint from every piece of evidence at once.
 *
 * Pure and tested because it is where the honesty rules live: a key must never
 * look confident on thin evidence. Three cases are easy to get wrong and are
 * settled here rather than in each action shell:
 *
 *   - A scan that could not identify every candidate process is not proof that
 *     the ONE session it found is the only one in this folder. Without a
 *     captured session id — the thing that would make it unambiguous — the
 *     honest face is `unknown`, not that session's state.
 *   - Once a key has captured a session id that id is binding. If a trustworthy
 *     scan no longer finds it, the answer is "no target", never the neighbour
 *     that happens to share the folder.
 *   - A visible approval prompt outranks the file-derived state. MEASURED: a
 *     blocked Claude Code session still shows its idle "✳" marker and so reads
 *     `waiting`, while a blocked Cursor session reads `working`. Requiring
 *     `working` here — as the Cursor-only predecessor did — would make the
 *     branch unreachable for Claude and silently kill the whole feature. The
 *     prompt on screen is direct evidence either way.
 *
 * `blockedOnPane` is only ever true for claude and cursor: codex carries its own
 * `blocked` in `instanceState` and is never scraped ({@link paneShowsAgentPrompt}).
 */
export function decideAgentFace(args: {
	kind: AgentKind;
	/** The key has a project configured at all. */
	hasTarget: boolean;
	/** How many live sessions sit in that project folder. */
	matchCount: number;
	/** The selected session's own state, or null when none was selected. */
	instanceState: Exclude<AgentState, "none"> | null;
	scanStatus: "ok" | "unknown";
	hasCapturedId: boolean;
	/**
	 * The result of asking the terminal whether this agent is showing its
	 * approval prompt. THREE outcomes, not two: `failed` means the question
	 * could not be answered (the tmux probe errored), which is NOT the same as
	 * answering "no". Collapsing it to false would paint a blocked Claude as a
	 * calm idle prompt — precisely the misreport this state exists to prevent.
	 * `clear` means the terminal was read and showed no prompt.
	 */
	blockedProbe: "clear" | "blocked" | "failed";
}): AgentState {
	if (!args.hasTarget) return "none";
	if (args.instanceState === null) {
		if (args.scanStatus !== "ok") return "unknown";
		// A trustworthy scan that did not turn up the captured session means that
		// session has exited — "no target". Reporting `unknown` because OTHER
		// sessions share the folder would contradict the binding-capture rule:
		// those neighbours are not this key's.
		if (args.hasCapturedId) return "none";
		return args.matchCount > 1 ? "unknown" : "none";
	}
	// `scanStatus` here is THIS kind's own probe (see kindTrusted). If it failed,
	// nothing about this session was actually observed this tick — a captured id
	// disambiguates WHICH session is meant, it does not make an unobserved one
	// trustworthy. So the exemption a captured id used to buy is gone.
	if (args.scanStatus !== "ok") return "unknown";
	// A visible prompt is direct evidence and outranks the file-derived state.
	// It must upgrade from "waiting" as well as "working": Claude Code keeps its
	// IDLE title marker while its approval prompt is on screen (measured), so
	// gating this on "working" alone would make it unreachable for Claude.
	if (args.blockedProbe === "blocked") return "blocked";
	// The probe failed, so "is it waiting on the operator?" is unanswered — and
	// that is exactly the question this key exists to answer. Say so.
	if (args.blockedProbe === "failed") return "unknown";
	return args.instanceState;
}

/**
 * The per-key memory behind the unread mark.
 *
 * It is deliberately tiny and deliberately BOUND to one target: a key that gets
 * re-taught, or whose project is retyped in the settings screen, must not
 * inherit the previous target's history. {@link trackAgentTurn} compares
 * `binding` on every commit and starts over when it differs, which is also what
 * makes the whole thing safe against a slow refresh pass committing after a
 * capture has already changed the key (there is no lock; a stale commit simply
 * carries a stale binding and is discarded).
 */
export interface AgentTurnMemory {
	/** Which target this memory describes — see {@link agentBindingKey}. */
	binding: string;
	/**
	 * The pid of the process this history was observed on, or 0 before any
	 * session has been seen.
	 *
	 * The binding alone is not enough for Claude Code, which exposes no session
	 * id and is therefore bound by project path only: a session that exits and
	 * a DIFFERENT Claude started in the same folder share one binding exactly.
	 * Without the pid, a working turn that never finished could hand its
	 * evidence to whichever session was sitting at an idle prompt afterwards —
	 * reachable whenever a scan failure hides the swap, since a failed scan
	 * deliberately preserves the memory. Codex and Cursor get this for free
	 * from their session ids; this is what gives Claude the same guarantee.
	 */
	instancePid: number;
	/**
	 * A `working` face has been observed since the last time the turn was seen
	 * to end. This is the "a turn really did run" evidence, and ONLY `working`
	 * sets it. `blocked` deliberately does not: a blocked agent is by definition
	 * not working, so an approval prompt that appears and is then dismissed —
	 * or a pane scrape that matched prompt-like text in ordinary output — would
	 * otherwise manufacture a completion that never happened.
	 */
	sawActivity: boolean;
	/** A turn ended while the key was not hot, and the key has not been hot since. */
	unseen: boolean;
}

/**
 * The identity a memory belongs to: the exact triple a key is bound to.
 *
 * Any change to it — a re-teach, a hand-typed project path, a key that has not
 * been taught yet — produces a different string and therefore a fresh memory.
 */
export function agentBindingKey(kind: AgentKind | undefined, project: string, sessionId: string): string {
	return `${kind ?? "-"}|${project}|${sessionId}`;
}

/** A memory that has observed nothing yet. Cold start lives here: with
 * `sawActivity` false there is no transition to complete, so the very first
 * tick of a key sitting next to an already-idle agent cannot arm the mark. */
export function initialTurnMemory(binding: string): AgentTurnMemory {
	return { binding, instancePid: 0, sawActivity: false, unseen: false };
}

/**
 * One tick's observation of a key, as far as the unread mark is concerned.
 *
 * `ambiguous` is the reason this is not just an {@link AgentState}: the
 * `unknown` face has several causes and they must not be treated alike. A
 * failed pane probe or an untrusted scan means "we could not look this tick",
 * and forgetting the memory there would let any transient hiccup swallow a
 * notification. Two live sessions matching one folder is a different thing
 * entirely — the key can no longer say WHICH session it is watching, so
 * activity credited to it may belong to the other one. See
 * {@link agentUnknownIsAmbiguity}.
 */
export interface AgentTurnObservation {
	binding: string;
	face: AgentState;
	hot: boolean;
	/** Only meaningful when `face` is `unknown`. */
	ambiguous: boolean;
	/** The pid of the session selected this tick, or 0 when none was — an
	 * unreadable tick, not a claim that the process changed. See
	 * {@link AgentTurnMemory.instancePid}. */
	pid: number;
}

/**
 * Advance the unread-mark memory by one observed tick.
 *
 * The exact guarantee, which the documentation must not round up: the mark says
 * *the most recently completed turn finished while you were not looking at this
 * session, and you have not looked since*. It does NOT say the session has
 * unread output in any general sense, and it does not survive a new turn —
 * starting more work supersedes the previous result (an operator decision;
 * the cost is that a turn started by someone the plugin cannot see, such as a
 * second tmux client over ssh, silently discards the earlier mark).
 *
 * The other limit, which the user-facing text also has to state: this is a
 * SAMPLED signal. A turn that starts and finishes between two polls is never
 * observed working, so it leaves no mark. The mark reports turns the plugin
 * watched run, not every turn that happened.
 *
 * Order matters in one place: `hot` is applied LAST, so being at the terminal
 * dismisses the mark whatever this tick's face turned out to be — including an
 * `unknown` face, where the honest reading is that we could not check but the
 * operator is demonstrably right there.
 */
export function trackAgentTurn(prev: AgentTurnMemory, obs: AgentTurnObservation): AgentTurnMemory {
	// A commit for a different target is not this memory's business. This is
	// also the whole concurrency story: a refresh that started before a capture
	// changed the key arrives carrying the OLD binding and resets instead of
	// merging, so no lock is needed between the poll and the press paths.
	const rebound = prev.binding === obs.binding ? prev : initialTurnMemory(obs.binding);
	// A pid of 0 means "nothing was selected this tick", which is silence, not a
	// change — the memory must survive a tick that could not see the session.
	// A DIFFERENT pid is a different process, and its predecessor's turn is not
	// its own however identical the binding looks.
	const base = obs.pid !== 0 && rebound.instancePid !== 0 && rebound.instancePid !== obs.pid
		? initialTurnMemory(obs.binding)
		: rebound;
	const pid = obs.pid !== 0 ? obs.pid : base.instancePid;
	let next: AgentTurnMemory;
	switch (obs.face) {
		case "working":
			// The only edge that proves a turn ran.
			next = { binding: obs.binding, instancePid: pid, sawActivity: true, unseen: false };
			break;
		case "blocked":
			// Preserves the evidence, never creates it (see `sawActivity`), and
			// clears the mark because reaching an approval prompt means a turn is
			// in flight again.
			next = { binding: obs.binding, instancePid: pid, sawActivity: base.sawActivity, unseen: false };
			break;
		case "waiting":
			// The turn ended. Arm only if we actually watched it run, and spend
			// the evidence so a second idle tick cannot re-arm from the same turn.
			next = { binding: obs.binding, instancePid: pid, sawActivity: false, unseen: base.unseen || base.sawActivity };
			break;
		case "none":
			// The session is gone. A mark on a dead session could never be
			// dismissed — pressing the key raises nothing — so it must not exist.
			next = initialTurnMemory(obs.binding);
			break;
		case "unknown":
			// Transparent for "could not look", reset for "no longer know which
			// session this is" — the distinction F002 of the plan review turned on.
			next = obs.ambiguous ? initialTurnMemory(obs.binding) : { ...base, binding: obs.binding, instancePid: pid };
			break;
	}
	return obs.hot ? { ...next, unseen: false } : next;
}

/**
 * Is this tick's `unknown` face caused by not knowing WHICH session the key
 * watches, rather than by a probe that could not answer?
 *
 * Mirrors the `matchCount > 1` branch of {@link decideAgentFace} exactly: a
 * trustworthy scan, no captured session id to disambiguate with, nothing
 * selected, and more than one live session in the folder. That is reachable in
 * normal use — Claude Code exposes no session id, so two Claude sessions in one
 * project produce it — and it is the one `unknown` that must forget history.
 */
export function agentUnknownIsAmbiguity(args: {
	scanStatus: "ok" | "unknown";
	hasCapturedId: boolean;
	instanceSelected: boolean;
	matchCount: number;
}): boolean {
	return args.scanStatus === "ok" && !args.hasCapturedId && !args.instanceSelected && args.matchCount > 1;
}

/**
 * Should a refresh pass throw away what it computed for one key?
 *
 * A pass reads each key's settings, spends several hundred milliseconds on
 * probes, and only then commits. Two things can happen in that window and both
 * make the result worthless rather than merely late:
 *
 *   - the key disappeared (a page switch), so committing would leave state
 *     behind for a key nobody can see; or
 *   - the operator pressed it — a capture changed what the key means, or a
 *     successful raise means they are now AT the session and have answered the
 *     very question the unread mark was asking.
 *
 * The generation must be sampled before that key's settings are read, not
 * after: sampling it later lets a press that lands between the two go
 * undetected, because it is already counted in the generation while the
 * settings still describe the world before it.
 */
export function commitIsStale(args: { stillVisible: boolean; genAtRead: number; genNow: number }): boolean {
	return !args.stillVisible || args.genAtRead !== args.genNow;
}

/**
 * Does a key's unread mark deserve the full poll cadence this tick?
 *
 * Only when the mark is BOTH armed and dismissible: the face is `waiting`, so
 * the session is really there and going to it would clear the mark. A mark
 * carried across an `unknown` face is remembered history on a target we cannot
 * currently see, and letting that hold the poller at 2.5s would mean one broken
 * probe pins every visible key at full rate for as long as it stays broken.
 */
export function unseenIsActionable(memory: AgentTurnMemory, face: AgentState): boolean {
	return memory.unseen && face === "waiting";
}

function projectBasename(path: string): string {
	const p = normalizeProjectPath(path);
	return p.slice(p.lastIndexOf("/") + 1) || "?";
}

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const MONO = "Menlo, Monaco, monospace";

/** The unread mark's red. Not a state colour — see {@link buildAgentProjectKeyImage}. */
const UNREAD_RED = "#FF4A4A";

/** Twelve positions around the state glyph. The glyphs are close to
 * rotationally symmetric at key size, so spinning them collapses to a wobble
 * you cannot see; an orbiting dot gives 12 genuinely distinct frames. */
const ORBIT: ReadonlyArray<readonly [number, number]> = [[61, 4], [65, 5.1], [67.9, 8], [69, 12], [67.9, 16], [65, 18.9], [61, 20], [57, 18.9], [54.1, 16], [53, 12], [54.1, 8], [57, 5.1]];

/** The top-right state glyph, one shape per kind, so a crowded deck says at a
 * glance WHICH agent a key captured and not merely that it captured one. */
function stateGlyph(kind: AgentKind, color: string): string {
	switch (kind) {
		case "claude":
			// Claude's coral spark/asterisk.
			return `<path d="M56 12h10M58.5 7.7l5 8.6M63.5 7.7l-5 8.6" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
		case "codex":
			// Codex's nested square.
			return `<path d="M56 7h10v10H56zM59 10h4v4h-4z" fill="none" stroke="${color}" stroke-width="1.8"/>`;
		case "cursor":
			// Cursor's arrow pointer.
			return `<path d="M57 5l9 10.5-4.4.4 2.6 5.2-2.6 1.3-2.6-5.2-3 3.2z" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
	}
}

/** The small mark at the bar's left end — the same shape as the state glyph,
 * so the key still identifies its agent when there is nothing to report. */
function footMark(kind: AgentKind, color: string): string {
	switch (kind) {
		case "claude":
			return `<path d="M6.5 64.25h7M8 61.25l4 6M12 61.25l-4 6" stroke="${color}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
		case "codex":
			return `<path d="M7 61h7v7H7zM9 63h3v3H9z" fill="none" stroke="${color}" stroke-width="1.2"/>`;
		case "cursor":
			return `<path d="M8 61l5 5.8-2.5.2 1.5 2.9-1.5.7-1.5-2.9-1.7 1.8z" fill="none" stroke="${color}" stroke-width="1.1" stroke-linejoin="round"/>`;
	}
}

/**
 * The unified live key face, 72x72, on the shared ink ground.
 *
 * Hex colours ONLY — the KEY rasterizer paints `hsl()` as solid black (the
 * touchscreen pixmap pipeline renders it fine), so every hue goes through
 * {@link hslToHex}; a unit test asserts no `hsl(` literal survives for any
 * kind/state/hot/unseen combination. The project name is XML-escaped and
 * truncated to what fits the key.
 *
 * The unread mark is a stripe down the LEFT EDGE rather than a change of ground
 * or state colour, and that is a deliberate constraint, not a style preference:
 * the deck runs one colour language — blue working, amber waiting on you, white
 * idle — and amber is the loudest thing on it because a blocked agent needs you
 * now. An unread finished turn is less urgent than that, so it gets its own
 * layer instead of a fourth state colour, and the face underneath keeps saying
 * what the session is doing. Measured at 216px through inkscape: 4px clears
 * both the longest project name and the foot bar, and a corner dot does not —
 * it collides with the "TERMINAL" eyebrow.
 */
export function buildAgentProjectKeyImage(args: {
	kind: AgentKind;
	project: string;
	host: AgentHost;
	hot: boolean;
	state: AgentState;
	spin?: number;
	/** Paint the unread mark. The builder draws it whenever asked; keeping it
	 * honest is {@link trackAgentTurn}'s job, not this function's. */
	unseen?: boolean;
}): string {
	const base = projectBasename(args.project);
	const name = truncate(base, 9);
	const hue = sessionHue(base);
	const active = args.state !== "none";
	const color = args.state === "working" ? "#4E9CFF" : args.state === "blocked" ? "#F0A63C" : args.state === "waiting" ? "#F2FFF6" : "#8B9490";
	const nameFill = active ? args.hot ? "#FFFFFF" : "#A6ADA9" : "#6A716E";
	const bar = !active
		? '<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>'
		: args.hot
			? `<rect x="0" y="57" width="72" height="15" fill="${hslToHex(hue, 62, 42)}"/><rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`
			: `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
	// Anchored at x=30, not centre: the longest host label ("TERMINAL") must
	// clear the state glyph in the top-right corner.
	const eyebrow = args.host
		? `<text x="30" y="15" text-anchor="middle" font-family="${MONO}" font-size="7.5" letter-spacing="1" fill="${hslToHex(hue, 50, 70)}">${escapeXml(args.host.toUpperCase())}</text>`
		: "";
	let glyph = "";
	if (active) {
		glyph = stateGlyph(args.kind, color);
		if (args.state === "working") {
			const [x, y] = ORBIT[(args.spin ?? 0) % ORBIT.length];
			glyph += `<circle cx="${x}" cy="${y}" r="1.7" fill="#4E9CFF"/>`;
		}
		// The hollow-outline glyphs get an amber core when blocked. Claude's spark
		// is skipped: its three strokes already cross at exactly this point, so a
		// dot there would only thicken the join. Its whole spark is amber instead.
		if (args.state === "blocked" && args.kind !== "claude") {
			glyph += `<circle cx="61" cy="12" r="1.7" fill="#F0A63C"/>`;
		}
	}
	const mark = footMark(args.kind, active ? args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70) : "#8B9490");
	// Painted last so nothing can overdraw it, and stopped at y=57 so it never
	// touches the foot bar, whose one meaning is "your keystrokes reach this
	// session" — the exact condition under which this mark cannot be showing.
	const unread = args.unseen ? `<rect x="0" y="0" width="4" height="57" fill="${UNREAD_RED}"/>` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#0F1211"/>${eyebrow}${glyph}<text x="36" y="40" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>${bar}${mark}${unread}</svg>`;
}
