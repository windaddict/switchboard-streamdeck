/**
 * WHAT IT'S FOR: the pure Claude Code parsing and state layer that AI Project
 * and Focus tmux rely on (through claude-scan.ts and agent-scan.ts): it parses
 * the ps/lsof output that finds Claude Code CLI instances on any host (tmux,
 * plain iTerm2, Terminal.app) and decides each one's state
 * ({@link claudeVerdict}). The impure scanning lives in claude-scan.ts; this
 * module only parses and decides. It began as the logic of the per-agent
 * Claude Project key, which v2.0.0 retired.
 *
 * Test-only exports: `projectClaudeState`, `instancesForProject` and
 * `projectBasename` lost their last production caller with that key. They
 * stay, covered by tests, until the cleanup listed in TODO.md.
 *
 * Identity model: a button targets a PROJECT DIRECTORY. A claude process
 * belongs to it when its cwd matches. State comes FIRST from Claude Code's own
 * report (`claude agents --json`, see claude-agents.ts). The signals below are
 * the FALLBACK when that report is unavailable or does not list the pid:
 * the tmux pane title's spinner marker when the instance is tmux-hosted
 * (always readable via the tmux server), else the freshness of the newest
 * transcript .jsonl under ~/.claude/projects/<slug>/ — verified to advance
 * only while a session is actively working.
 *
 * Known limits (documented, not defects introduced here):
 * - Two claude sessions in the SAME cwd share a project transcript dir; the
 *   NEWEST .jsonl is read, so an idle session can briefly borrow a busy
 *   same-project session's "working". Exact pid→session-file correlation
 *   would need a per-pid lsof of open fds (cost); deferred while the common
 *   case is one session per project.
 * - While a session STREAMS its final text response under a ✳ title (no tool
 *   coming), the transcript momentarily shows a completed assistant turn, so
 *   a tmux key can read "waiting" for the few seconds of that stream. The
 *   robust fix (parse Claude Code's stop_reason/message-id internals) couples
 *   us to an undocumented, version-fragile format — rejected as
 *   disproportionate to a transient, self-correcting misread.
 * - The CLI report can stick on `busy` after a parked mid-flight turn
 *   (claudeissues #87131, 2.1.220): the key stays blue until the session is
 *   used again. The report's JSON format also carries no stability promise.
 */

import type { ClaudeReportedState } from "./claude-agents.js";
import type { ClaudeState } from "./claude-state.js";

/** A running Claude Code CLI process. */
export interface ClaudeInstance {
	pid: number;
	/** Controlling tty device path, e.g. "/dev/ttys007" ("" when none). */
	tty: string;
	/** The process's working directory = its project. */
	cwd: string;
	/** A shell tool (foreground or backgrounded) is running under this claude. */
	shellBusy: boolean;
	/** Claude Code's own verdict for this pid from `claude agents --json`;
	 * null when the CLI did not answer for it (fall back to the signals). */
	reported: ClaudeReportedState | null;
	/** The CLI's `waitingFor` text; "" unless it gave one. */
	waitingFor: string;
}

export interface PsProc {
	pid: number;
	ppid: number;
	tty: string;
	comm: string;
}

/**
 * Parse cheap `ps -axo pid=,ppid=,tty=,comm=` output. This deliberately
 * avoids `command=` (full argv extraction costs ~0.13s CPU per call across
 * all processes); the argv check needed for shell-busy detection runs as a
 * TARGETED second pass over claude children only. NOTE: enumerate with ps,
 * not pgrep — BSD pgrep silently omits its own ancestor processes.
 */
export function parsePsProcs(output: string): PsProc[] {
	const procs: PsProc[] = [];
	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line === "") continue;
		const fields = line.split(/\s+/);
		if (fields.length < 4) continue;
		const pid = Number.parseInt(fields[0], 10);
		const ppid = Number.parseInt(fields[1], 10);
		if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
		procs.push({ pid, ppid, tty: fields[2], comm: fields.slice(3).join(" ") });
	}
	return procs;
}

/** claude CLI processes (comm basename "claude") with a controlling tty. */
export function claudesFrom(procs: PsProc[]): Array<{ pid: number; tty: string }> {
	return procs
		.filter((p) => p.comm.slice(p.comm.lastIndexOf("/") + 1) === "claude" && p.tty !== "??")
		.map((p) => ({ pid: p.pid, tty: `/dev/${p.tty}` }));
}

/** Direct children of the given pids (candidates for the argv confirm pass). */
export function childrenOf(procs: PsProc[], parents: ReadonlySet<number>): number[] {
	return procs.filter((p) => parents.has(p.ppid)).map((p) => p.pid);
}

/**
 * Parse targeted `ps -o pid=,ppid=,command= -p <children>` output and return
 * the PARENT pids that have a live shell-snapshot child — Claude Code runs
 * every Bash tool (foreground or backgrounded) as a direct child via its
 * shell-snapshot mechanism, so this is true exactly while "N shells still
 * running". No shell-name assumptions: the argv marker is the invariant.
 */
export function busyParentsFrom(confirmOutput: string): Set<number> {
	const busy = new Set<number>();
	for (const rawLine of confirmOutput.split("\n")) {
		const line = rawLine.trim();
		if (line === "") continue;
		const fields = line.split(/\s+/);
		if (fields.length < 3) continue;
		const ppid = Number.parseInt(fields[1], 10);
		if (Number.isFinite(ppid) && line.includes("shell-snapshots/snapshot-")) {
			busy.add(ppid);
		}
	}
	return busy;
}

/** Parse batched `lsof -a -p <csv> -d cwd -Fpn` output into pid → cwd. */
export function parseLsofCwds(output: string): Map<number, string> {
	const cwds = new Map<number, string>();
	let pid: number | null = null;
	for (const line of output.split("\n")) {
		if (line.startsWith("p")) {
			const n = Number.parseInt(line.slice(1), 10);
			pid = Number.isFinite(n) ? n : null;
		} else if (line.startsWith("n") && pid !== null) {
			cwds.set(pid, line.slice(1));
		}
	}
	return cwds;
}

/** ~/.claude/projects directory name for a project path: every
 * non-alphanumeric character becomes "-" (verified transform). */
export function projectSlug(projectPath: string): string {
	return projectPath.replace(/[^A-Za-z0-9]/g, "-");
}

/** Normalize a configured project path for matching (trailing slash off). */
export function normalizeProjectPath(p: string): string {
	const trimmed = p.trim();
	return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

/** The instances whose cwd is exactly the target project. */
export function instancesForProject(
	instances: ClaudeInstance[],
	projectPath: string,
): ClaudeInstance[] {
	const target = normalizeProjectPath(projectPath);
	return instances.filter((i) => normalizeProjectPath(i.cwd) === target);
}

/** A transcript younger than this is "actively working". */
export const TRANSCRIPT_FRESH_MS = 30_000;

export type ClaudeVerdict = "working" | "blocked" | "waiting";

/**
 * Decide one Claude session's state. Claude Code's own report
 * (`claude agents --json`) outranks every inferred signal: reported working
 * is working, reported blocked is blocked, and reported idle is waiting
 * EXCEPT that a live shell-snapshot child still reads working ("Brewed … · 1
 * shell still running"). An owing transcript does NOT override reported idle:
 * that is the /login false positive. With no report (or an unrecognised
 * status) the older chain applies: title spinner, shell child, owing
 * transcript, idle title, fresh transcript mtime.
 */
export function claudeVerdict(args: {
	/** The CLI's verdict for this pid; null/undefined when it did not answer. */
	reported?: ClaudeReportedState | null;
	/** true/false when a tmux pane title was readable; null when unknown. */
	titleWorking: boolean | null;
	/** Age of the newest transcript .jsonl in ms; null when none found. */
	transcriptAgeMs: number | null;
	/** The transcript shows Claude OWING the next turn — Brewing (awaiting the
	 * model after a prompt/tool result) or a tool running. This is the
	 * authoritative inferred "is it working" signal: the ✳ terminal title does
	 * NOT mean "waiting for you", only "no tool actively executing", which is
	 * ALSO true while Brewing. So this OUTRANKS the idle title. */
	transcriptWorking?: boolean;
	/** A shell tool is running under the claude process right now. OUTRANKS an
	 * idle title or idle report: a backgrounded shell keeps running after the
	 * turn ends and the title flips to ✳ ("Brewed … · 1 shell still running"). */
	shellBusy?: boolean;
}): ClaudeVerdict {
	if (args.reported === "working") return "working";
	if (args.reported === "blocked") return "blocked";
	if (args.reported === "waiting") return args.shellBusy === true ? "working" : "waiting";
	if (args.titleWorking === true) return "working"; // braille spinner: fast-path
	if (args.shellBusy === true) return "working";
	// The PRECISE transcript signal (Claude owes the next turn) overrides the ✳
	// title — that is the Brewing fix. A mere fresh mtime does NOT override ✳,
	// or every key would read "working" for ~30s after each turn completes.
	if (args.transcriptWorking === true) return "working";
	// ✳ title with a quiet, non-owing transcript = genuinely idle at the prompt.
	if (args.titleWorking === false) return "waiting";
	// No readable title (non-tmux host): a fresh transcript means streaming.
	if (args.transcriptAgeMs !== null && args.transcriptAgeMs < TRANSCRIPT_FRESH_MS) {
		return "working";
	}
	return "waiting";
}

/**
 * The retired Claude Project key's state: {@link claudeVerdict} with `blocked`
 * folded into `waiting` (that key's `ClaudeState` had no blocked; its white
 * meant "not working"). Test-only since v2.0.0.
 */
export function projectClaudeState(args: {
	present: boolean;
	reported?: ClaudeReportedState | null;
	titleWorking: boolean | null;
	transcriptAgeMs: number | null;
	transcriptWorking?: boolean;
	shellBusy?: boolean;
}): ClaudeState {
	if (!args.present) return "none";
	const verdict = claudeVerdict(args);
	return verdict === "blocked" ? "waiting" : verdict;
}

/** Last path segment as the display name ("" -> "?"). */
export function projectBasename(projectPath: string): string {
	const normalized = normalizeProjectPath(projectPath);
	const base = normalized.slice(normalized.lastIndexOf("/") + 1);
	return base || "?";
}
