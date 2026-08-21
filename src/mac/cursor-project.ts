/**
 * WHAT IT'S FOR: the pure decision layer behind the Cursor Project key — the
 * one place that answers "which running Cursor CLI session is this key's
 * project, and is it working, blocked on me, or idle?" so the action shell
 * stays a thin wire between Stream Deck events and tested logic.
 *
 * Cursor's CLI (`cursor-agent`) looks superficially like Codex but records
 * state very differently, and three of the Codex signals do NOT port. Each
 * difference below was measured against cursor-agent 2026.08.11-e8db854, and
 * the comments say what was observed rather than what seemed likely:
 *
 *   - `ps -o comm=` is TRUNCATED to 16 characters for these processes (it
 *     comes back as `/Users/johnknox/`), so identity must be read from `args`.
 *   - There is no `originator` field and no state marker in the terminal
 *     title (the title is the chat's name, identical whether the agent is
 *     working, blocked, or idle), so neither Codex's nor Claude Code's
 *     identity trick is available.
 *   - Transcript records are appended AFTER a tool runs, not when the model
 *     asks for it. While a session sits on an approval prompt its transcript
 *     is byte-identical to a session waiting on the model. Tail SHAPE
 *     therefore cannot decide working-vs-blocked, and this module does not
 *     try to; see {@link cursorStateFromTranscriptLines}.
 *
 * Privacy: transcripts hold the operator's prompts and command text. A bounded
 * tail of those bytes is necessarily parsed here, but the ONLY fields retained
 * or returned are the structural ones (`type`, `role`); no message content
 * leaves this module, and none is ever logged. That is a minimisation, not an
 * isolation guarantee — the bytes do pass through this process's memory.
 */

import { deprecationBadge } from "./deprecation.js";
import { hslToHex } from "./svg.js";
import { escapeXml, sessionHue } from "./tmux-window.js";

// Generic tmux-pane and lsof plumbing, shared with Codex Project rather than
// duplicated: both features ask the same two questions (which pane owns this
// tty, and which files does this pid hold open).
export {
	type CodexPane as CursorPane,
	type LsofEntry,
	LIST_CODEX_PANES_ARGS as LIST_CURSOR_PANES_ARGS,
	codexTmuxFocusArgs as cursorTmuxFocusArgs,
	normalizeProjectPath,
	parseCodexPanes as parseCursorPanes,
	parseLsofEntries,
} from "./codex-project.js";

import { type CodexPane, normalizeProjectPath } from "./codex-project.js";

/**
 * `none` no such session; `working` a turn is in flight; `blocked` the agent
 * is holding for the operator's approval; `waiting` the turn ended and the
 * prompt is idle; `unknown` a probe failed or several sessions match and we
 * refuse to guess.
 */
export type CursorState = "none" | "working" | "blocked" | "waiting" | "unknown";
export type CursorHost = "tmux" | "iterm" | "terminal" | "";

export interface CursorInstance {
	pid: number;
	tty: string;
	cwd: string;
	/** Chat-store directory backing this session (identity, not content). */
	chatDir: string;
	sessionId: string;
	state: Exclude<CursorState, "none">;
}

export interface CursorProcess {
	pid: number;
	ppid: number;
	tty: string;
	args: string;
}

/** Parse targeted `ps -o pid=,ppid=,tty=,args=` output. `comm` is deliberately
 * absent: it truncates at 16 chars for cursor-agent and is useless here. */
export function parseCursorProcesses(output: string): CursorProcess[] {
	const result: CursorProcess[] = [];
	for (const raw of output.split("\n")) {
		const m = raw.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
		if (m === null) continue;
		const pid = Number.parseInt(m[1], 10);
		const ppid = Number.parseInt(m[2], 10);
		if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
		result.push({ pid, ppid, tty: m[3], args: m[4] });
	}
	return result;
}

/** The installed-version path every cursor-agent process carries in argv,
 * whichever of the two interchangeable symlinks (`agent`, `cursor-agent`) the
 * operator typed. Anchored to the real layout so an unrelated process that
 * merely mentions "cursor-agent" (an editor open on a file of that name, a
 * grep) cannot enter the scan. */
const CURSOR_ARGV = /(^|\/)\.local\/share\/cursor-agent\/versions\/[^/\s]+\//;

/** Cheap candidate gate: a real controlling tty (a TUI session, not a daemon)
 * plus the installed-version path in argv. */
export function isCursorProcess(p: CursorProcess): boolean {
	return p.tty !== "??" && p.tty !== "?" && CURSOR_ARGV.test(p.args);
}

/** A worker is launched as the versioned `node` binary directly; an operator's
 * session is launched through the `bin/agent` or `bin/cursor-agent` wrapper.
 * Matched from the start of argv but WITHOUT assuming the path is
 * whitespace-free: a home directory containing a space (`/Users/Jane Doe/…`)
 * used to make this fail, leaving the worker in the list and rendering every
 * key on that machine permanently ambiguous. */
const WORKER_ARGV = /^\/[^\n]*?\/\.local\/share\/cursor-agent\/versions\/[^/]+\/node(\s|$)/;

/**
 * Drop cursor-agent's own worker child. Every interactive session forks a
 * long-lived `.../versions/<v>/node .../index.js` helper that matches the
 * same argv pattern, shares the session's tty AND its chat store — left in,
 * it would masquerade as a second session on the same project and force every
 * key to the deliberately-ambiguous `unknown` face.
 *
 * BOTH conditions are required: the process is parented by another candidate
 * AND its argv has the worker's shape. Parentage alone would also swallow a
 * genuine session that happens to have been started from inside another
 * session's terminal, which is a real session the operator may want a key for.
 */
export function withoutWorkerChildren(procs: readonly CursorProcess[]): CursorProcess[] {
	const pids = new Set(procs.map((p) => p.pid));
	return procs.filter((p) => !(pids.has(p.ppid) && WORKER_ARGV.test(p.args)));
}

/** Is this an open file inside a session's chat store? */
export function isCursorChatPath(path: string): boolean {
	// Deliberately not anchored on the literal `.cursor` segment: lsof reports
	// the RESOLVED path, so a symlinked or relocated config directory would
	// otherwise stop every session being recognised. The remaining shape —
	// a 32-hex project hash, a session UUID, and a store.db file — is specific
	// enough, and only files held open by a confirmed cursor-agent are tested.
	return /\/chats\/[0-9a-f]{32}\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/store\.db(-wal|-shm)?$/i.test(path);
}

/** The chat-store directory holding a session's files, or "" if not one. */
export function cursorChatDir(path: string): string {
	return isCursorChatPath(path) ? path.slice(0, path.lastIndexOf("/")) : "";
}

/** Session UUID = the final path component of the chat-store directory. */
export function cursorSessionId(chatDir: string): string {
	return chatDir.match(/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i)?.[1] ?? "";
}

/**
 * The single chat directory a process is using, or "" when the evidence is
 * not unambiguous. A process holds store.db, -wal and -shm open at once, so
 * several entries are normal and must collapse to ONE directory; zero matches
 * (a session still starting) and two distinct directories (a session being
 * switched) both mean "don't claim to know which conversation this is".
 */
export function soleChatDir(paths: readonly string[]): string {
	const dirs = new Set<string>();
	for (const p of paths) {
		const dir = cursorChatDir(p);
		if (dir !== "") dirs.add(dir);
	}
	return dirs.size === 1 ? [...dirs][0] : "";
}

/**
 * Working/idle from the transcript, using ONLY the turn terminator.
 *
 * Cursor closes every turn with a `{"type":"turn_ended","status":...}` record
 * and appends tool records after the fact, so the presence of a terminator at
 * the tail is the one thing the file reliably says: terminator = the prompt is
 * idle; no terminator = a turn is still in flight. It cannot tell whether an
 * in-flight turn is computing or holding for approval — that needs the
 * terminal itself ({@link paneShowsApprovalPrompt}).
 *
 * An empty transcript means a session that has not been prompted yet, which
 * is idle. Lines that exist but do not parse are NOT evidence of anything, so
 * they yield `unknown` rather than a confident face. A turn that ended with
 * `status: "error"` still left the prompt idle, so it reads `waiting`.
 *
 * Pure; reads only `type`, `role` and `status` — never message content.
 */
export function cursorStateFromTranscriptLines(
	lines: readonly string[],
): "working" | "waiting" | "unknown" {
	let sawLine = false;
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (line === "") continue;
		sawLine = true;
		let row: { type?: unknown; role?: unknown };
		try {
			row = JSON.parse(line) as { type?: unknown; role?: unknown };
		} catch {
			continue; // a concurrent append or a clipped window edge is not evidence
		}
		if (row.type === "turn_ended") return "waiting";
		if (row.role === "user" || row.role === "assistant") return "working";
	}
	return sawLine ? "unknown" : "waiting";
}

/**
 * Does this terminal pane show Cursor's command-approval prompt?
 *
 * This is the ONLY direct evidence that a session is blocked on the operator;
 * no file Cursor writes distinguishes that from ordinary work. Matching is
 * deliberately narrow and fails SAFE: unrecognised wording yields false, so
 * the key falls back to `working` and can never invent an amber "needs you"
 * light that isn't real.
 */
export function paneShowsApprovalPrompt(paneText: string): boolean {
	// "Run this command?" alone is a phrase that could plausibly appear in
	// ordinary scrolled output, so it only counts alongside the choice line
	// that Cursor renders directly beneath it. The inline status marker is
	// specific enough to stand on its own.
	if (paneText.includes("Waiting for approval")) return true;
	return paneText.includes("Run this command?") && paneText.includes("Run (once)");
}

/**
 * tmux args capturing one pane's VISIBLE screen — deliberately no scrollback.
 *
 * An approval prompt is on screen for exactly as long as it is waiting, so the
 * live screen is sufficient evidence. Including history is not merely
 * unnecessary but wrong: an already-answered prompt lingers in the scrollback,
 * and matching it would hold the key amber while the agent is busy working.
 */
export function capturePaneArgs(paneId: string): string[] {
	return ["capture-pane", "-p", "-t", paneId];
}

export function cursorInstancesForProject(
	instances: readonly CursorInstance[],
	project: string,
): CursorInstance[] {
	const target = normalizeProjectPath(project);
	return instances.filter((i) => normalizeProjectPath(i.cwd) === target);
}

/**
 * Resolve the key's target session.
 *
 * Once a key has captured a session id that id is binding: if that exact
 * session is gone, the answer is "no target", NEVER the other session that
 * happens to share the folder. Quietly re-pointing at a same-cwd neighbour
 * would send the operator's keystrokes and window focus to a conversation
 * they never captured. Without a captured id a lone session is unambiguous;
 * two or more are not, and yield null so the caller can paint `unknown`.
 */
export function selectCursorInstance(
	instances: readonly CursorInstance[],
	project: string,
	sessionId: string,
): CursorInstance | null {
	const mine = cursorInstancesForProject(instances, project);
	if (sessionId !== "") {
		const matches = mine.filter((i) => i.sessionId === sessionId);
		return matches.length === 1 ? matches[0] : null;
	}
	return mine.length === 1 ? mine[0] : null;
}

/**
 * Compose the face a key should show from every piece of evidence at once.
 *
 * Pure and tested because it is where the honesty rules live: a key must never
 * look confident on thin evidence. Two cases in particular are easy to get
 * wrong and are handled explicitly here rather than in the action shell:
 *
 *   - A scan that could not identify every candidate process is not proof that
 *     the ONE session found is the only one in this folder. If the key has no
 *     captured session id — the thing that would make it unambiguous — the
 *     honest face is `unknown`, not that session's state.
 *   - Only an in-flight turn can be blocked; an idle prompt showing leftover
 *     approval text on screen must not turn the key amber.
 */
export function decideCursorFace(args: {
	/** The key has a project configured at all. */
	hasTarget: boolean;
	/** How many live sessions sit in that project folder. */
	matchCount: number;
	/** The selected session's own state, or null when none was selected. */
	instanceState: Exclude<CursorState, "none"> | null;
	scanStatus: "ok" | "unknown";
	hasCapturedId: boolean;
	/** The session's terminal is showing Cursor's approval prompt. */
	blockedOnPane: boolean;
}): CursorState {
	if (!args.hasTarget) return "none";
	if (args.instanceState === null) {
		// A trustworthy scan that did not turn up the captured session means that
		// session has exited — "no target". Reporting `unknown` because OTHER
		// sessions share the folder would contradict the binding-capture rule in
		// {@link selectCursorInstance}: those neighbours are not this key's.
		if (args.scanStatus !== "ok") return "unknown";
		if (args.hasCapturedId) return "none";
		return args.matchCount > 1 ? "unknown" : "none";
	}
	if (args.scanStatus !== "ok" && !args.hasCapturedId) return "unknown";
	if (args.instanceState === "working" && args.blockedOnPane) return "blocked";
	return args.instanceState;
}

/** The pane hosting a session, matched by tty. */
export function paneForTty(panes: readonly CodexPane[], tty: string): CodexPane | undefined {
	return panes.find((p) => p.tty === tty);
}

function projectBasename(path: string): string {
	const p = normalizeProjectPath(path);
	return p.slice(p.lastIndexOf("/") + 1) || "?";
}

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const MONO = "Menlo, Monaco, monospace";
const ORBIT: ReadonlyArray<readonly [number, number]> = [[61, 4], [65, 5.1], [67.9, 8], [69, 12], [67.9, 16], [65, 18.9], [61, 20], [57, 18.9], [54.1, 16], [53, 12], [54.1, 8], [57, 5.1]];

/**
 * Cursor sibling of the Claude and Codex live faces. Hex colours only — the
 * KEY rasterizer paints `hsl()` as black, so every colour goes through
 * {@link hslToHex} (a unit test asserts no `hsl(` literal survives).
 */
export function buildCursorProjectKeyImage(args: {
	project: string;
	host: CursorHost;
	hot: boolean;
	state: CursorState;
	spin?: number;
}): string {
	const name = truncate(projectBasename(args.project), 9);
	const hue = sessionHue(projectBasename(args.project));
	const active = args.state !== "none";
	const color = args.state === "working" ? "#4E9CFF" : args.state === "blocked" ? "#F0A63C" : args.state === "waiting" ? "#F2FFF6" : "#8B9490";
	const nameFill = active ? args.hot ? "#FFFFFF" : "#A6ADA9" : "#6A716E";
	const bar = !active
		? '<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>'
		: args.hot
			? `<rect x="0" y="57" width="72" height="15" fill="${hslToHex(hue, 62, 42)}"/><rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`
			: `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
	const eyebrow = args.host ? `<text x="30" y="15" text-anchor="middle" font-family="${MONO}" font-size="7.5" letter-spacing="1" fill="${hslToHex(hue, 50, 70)}">${escapeXml(args.host.toUpperCase())}</text>` : "";
	let glyph = "";
	if (active) {
		const spin = args.spin ?? 0;
		// Cursor's mark reads as an arrow pointer, distinguishing it at a glance
		// from Codex's square and Claude's asterisk on a crowded deck.
		glyph = `<path d="M57 5l9 10.5-4.4.4 2.6 5.2-2.6 1.3-2.6-5.2-3 3.2z" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
		if (args.state === "working") {
			const [x, y] = ORBIT[spin % ORBIT.length];
			glyph += `<circle cx="${x}" cy="${y}" r="1.7" fill="#4E9CFF"/>`;
		}
		if (args.state === "blocked") glyph += `<circle cx="61" cy="12" r="1.7" fill="#F0A63C"/>`;
	}
	const mark = `<path d="M8 61l5 5.8-2.5.2 1.5 2.9-1.5.7-1.5-2.9-1.7 1.8z" fill="none" stroke="${active ? args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70) : "#8B9490"}" stroke-width="1.1" stroke-linejoin="round"/>`;
	// Deprecation marker — superseded by AI Project; remove with this action.
	return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#0F1211"/>${deprecationBadge()}${eyebrow}${glyph}<text x="36" y="40" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>${bar}${mark}</svg>`;
}
