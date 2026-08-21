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
 *     operator" from "busy working". The ONLY direct evidence is the approval
 *     prompt drawn on the terminal, and the only terminal this plugin can read
 *     is a tmux pane. Outside tmux, "blocked" is simply not observable for
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
 */

import { normalizeProjectPath } from "./codex-project.js";
import { hslToHex } from "./svg.js";
import { escapeXml, sessionHue } from "./tmux-window.js";

/** Which agent CLI a key captured. */
export type AgentKind = "claude" | "codex" | "cursor";

/**
 * `none` no such session; `working` a turn is in flight; `blocked` the agent is
 * holding for the operator's approval; `waiting` the turn ended and the prompt
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

/** Claude Code's approval question. Two different wordings were measured —
 * "Do you want to proceed?" for a bash approval and "Do you want to make this
 * edit to <file>?" for an edit approval — so the matcher keys on the shared
 * stem rather than on either full sentence. `.` does not cross newlines, so
 * this necessarily matches WITHIN one line of pane text. */
const CLAUDE_ASK = /Do you want to .*\?/;

/**
 * Does this terminal pane show the agent's approval prompt — i.e. is it
 * blocked on the operator right now?
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
		case "claude":
			// The question alone is too ordinary a sentence to trust; Claude renders
			// a numbered choice list directly beneath it, and both measured wordings
			// carry "1. Yes".
			//
			// NEGATIVE CASE (measured): the folder-trust prompt — "Quick safety
			// check: Is this a project you created or one you trust?" with "1. Yes,
			// I trust this folder" — carries the same choice line but is NOT an
			// approval to act on, and must not turn the key amber. It is excluded by
			// the question stem: it never says "Do you want to". A test pins this.
			return CLAUDE_ASK.test(paneText) && paneText.includes("1. Yes");
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

function projectBasename(path: string): string {
	const p = normalizeProjectPath(path);
	return p.slice(p.lastIndexOf("/") + 1) || "?";
}

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const MONO = "Menlo, Monaco, monospace";

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
 * kind/state/hot combination. The project name is XML-escaped and truncated to
 * what fits the key.
 */
export function buildAgentProjectKeyImage(args: {
	kind: AgentKind;
	project: string;
	host: AgentHost;
	hot: boolean;
	state: AgentState;
	spin?: number;
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
	return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#0F1211"/>${eyebrow}${glyph}<text x="36" y="40" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>${bar}${mark}</svg>`;
}
