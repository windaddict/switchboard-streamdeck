/**
 * WHAT IT'S FOR: the one place Switchboard reads Claude Code's own report of
 * what each session is doing — `claude agents --json` — so the keys stop
 * inferring state from a terminal title that Claude Code 2.1.236+ no longer
 * updates under tmux.
 *
 * Field contract (from the Claude Code agent-view docs, fetched 2026-11-10):
 * the command prints a JSON array. An entry with `kind: "interactive"` is a
 * terminal session and carries `pid`, `cwd`, `sessionId` and, while the process
 * is alive, `status` (`busy`, `waiting` or `idle`). `waitingFor` is present when
 * `status` is `waiting`. `kind: "background"` entries carry `state` (`working|blocked|done|failed|stopped`). The docs list `pid` and `status` for ANY entry "while the process is alive", but every background entry measured (2.1.311, 2026-11-10 and 2026-11-11) had neither. This parser ignores background entries whatever they carry, so a background session gets no CLI state and falls back to the older signals (measuring an attached one is in TODO.md). There is no tty or tmux field, so presence and identity still
 * come from pgrep/ps/lsof (see claude-scan.ts); this module supplies only the
 * state, merged in by pid.
 *
 * Maturity: the docs label agent view a "research preview" and make no promise
 * that the JSON format stays stable. The parser therefore validates the one
 * field the decision needs (`status`) and reports an incompatible shape as
 * unavailable instead of guessing. An entry with another `kind` or without a
 * positive integer `pid` is dropped; when that leaves no session at all and at least
 * one dropped entry was not a `background` entry, the whole listing is
 * unavailable ("no usable interactive entry"), so a renamed `kind` or `pid`
 * field is logged once. The limit: a listing that keeps even one valid
 * session drops the others silently. Measured cost: about 0.12 s per call
 * (2026-11-10, 11 sessions).
 *
 * Fail-safe mapping: `busy` reads working, `waiting` reads blocked, `idle`
 * reads waiting, and every other value reads `unknown`, which falls through to
 * the older signals and can never read as blocked.
 *
 * Where the CLI is found: `findClaudePath` searches exactly four fixed
 * locations (`/opt/homebrew/bin/claude`, `/usr/local/bin/claude`,
 * `~/.claude/local/claude`, `~/.local/bin/claude`). A Claude Code installed
 * anywhere else is not found, and the scan falls back to the older signals.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";

export const CLAUDE_AGENTS_ARGS = ["agents", "--json"];

/** The only places the CLI is searched, in order. Never a bare `claude`:
 * Stream Deck launches plugins with a minimal PATH. */
export function CLAUDE_CANDIDATES(home: string): string[] {
	return [
		"/opt/homebrew/bin/claude",
		"/usr/local/bin/claude",
		`${home}/.claude/local/claude`,
		`${home}/.local/bin/claude`,
	];
}

/** First existing candidate, else null (a null is faster than a failed spawn). */
export function findClaudePath(
	exists: (path: string) => boolean = existsSync,
	home: string = homedir(),
): string | null {
	for (const candidate of CLAUDE_CANDIDATES(home)) {
		if (exists(candidate)) return candidate;
	}
	return null;
}

export type ClaudeReportedState = "working" | "blocked" | "waiting" | "unknown";

export interface ClaudeAgentSession {
	pid: number;
	cwd: string;
	sessionId: string;
	status: string;
	/** Verbatim from the CLI; "" when absent. Carried for logs, not decisions. */
	waitingFor: string;
}

export type ClaudeAgentsParse =
	| { ok: true; sessions: ClaudeAgentSession[] }
	| { ok: false; reason: string };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Parse `claude agents --json` stdout into interactive sessions keyed by pid.
 * Garbage is `ok:false`, never an empty list, because an empty list would read
 * as "no session is reported" instead of "the report is unusable".
 */
export function parseClaudeAgents(stdout: string): ClaudeAgentsParse {
	let data: unknown;
	try {
		data = JSON.parse(stdout);
	} catch {
		return { ok: false, reason: "invalid JSON" };
	}
	if (!Array.isArray(data)) return { ok: false, reason: "not an array" };
	const sessions: ClaudeAgentSession[] = [];
	// Entries skipped that were not plain background sessions. If nothing is
	// kept and something was, a `kind` or `pid` field was probably renamed.
	let droppedUnknown = 0;
	for (const raw of data) {
		if (raw === null || typeof raw !== "object") {
			droppedUnknown++;
			continue;
		}
		const e = raw as Record<string, unknown>;
		// A pid must be a positive integer: 0 or a negative names no process
		// pgrep can find, so keeping it would only hide that nothing matched.
		if (e.kind !== "interactive" || !Number.isInteger(e.pid) || (e.pid as number) <= 0) {
			if (e.kind !== "background") droppedUnknown++;
			continue;
		}
		// `status` is present while the process is alive; its absence means the
		// format changed (e.g. a renamed field), so the whole report is unusable.
		if (typeof e.status !== "string" || e.status === "") {
			return { ok: false, reason: "interactive entry without status" };
		}
		sessions.push({
			pid: e.pid as number,
			cwd: str(e.cwd),
			sessionId: str(e.sessionId),
			status: e.status,
			waitingFor: str(e.waitingFor),
		});
	}
	// The CLI is asked only after pgrep found a live claude, so an all-dropped
	// listing is a format change, not an empty machine: report it so the loss
	// is logged once instead of every key silently falling back.
	if (sessions.length === 0 && droppedUnknown > 0) return { ok: false, reason: "no usable interactive entry" };
	return { ok: true, sessions };
}

/** Map the CLI's `status` to a state; anything unrecognised is `unknown`. */
export function reportedState(status: string): ClaudeReportedState {
	switch (status) {
		case "busy":
			return "working";
		case "waiting":
			return "blocked";
		case "idle":
			return "waiting";
		default:
			return "unknown";
	}
}

/** True for a state the CLI actually decided. Such an instance needs no
 * fallback signal, so no transcript is read for it (agent-scan.ts gates its
 * transcript read on this). */
export function isRecognisedReport(
	r: ClaudeReportedState | null | undefined,
): r is "working" | "blocked" | "waiting" {
	return r === "working" || r === "blocked" || r === "waiting";
}

export type AgentsSource = "ok" | "unavailable" | "unasked";

/** `lost` on ok/undefined -> unavailable, `regained` on unavailable -> ok;
 * `unasked` is transparent (nothing was running, so nothing was learned). */
export function agentsSourceTransition(
	prev: AgentsSource | undefined,
	next: AgentsSource,
): "lost" | "regained" | null {
	if (next === "unavailable" && prev !== "unavailable") return "lost";
	if (next === "ok" && prev === "unavailable") return "regained";
	return null;
}

/** The log line for a transition, or null. The action shell prints only this. */
export function agentsSourceLogLine(
	prev: AgentsSource | undefined,
	next: AgentsSource,
	reason: string,
): { level: "warn" | "info"; message: string } | null {
	const t = agentsSourceTransition(prev, next);
	if (t === "lost") {
		return {
			level: "warn",
			message: `Claude state: claude agents --json unavailable (${reason}); falling back to title/transcript signals`,
		};
	}
	if (t === "regained") {
		return { level: "info", message: "Claude state: claude agents --json available again" };
	}
	return null;
}
