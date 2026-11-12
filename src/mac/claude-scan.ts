/**
 * WHAT IT'S FOR: the one place that asks the machine "which Claude Code CLI
 * sessions exist right now, in which project folders, and is a shell tool
 * still running under each?" — so every Claude-facing key repaints from a
 * single bounded snapshot instead of each key shelling out for itself.
 *
 * Shape of a scan: `pgrep` narrows to candidate pids (a full `ps -axo` costs
 * ~0.12s per call), one targeted `ps` reads their ttys, a second `pgrep -P` +
 * confirming `ps` spots a live shell-snapshot child, and one batched `lsof`
 * maps every pid to its project cwd (~0.06s total, measured). The child-probe
 * chain and the lsof cwd probe depend only on that first `ps`, so they run
 * CONCURRENTLY rather than one waiting on the other. Absolute binary paths —
 * Stream Deck launches plugins with a minimal PATH. `exec` injectable for
 * tests.
 *
 * The snapshot carries a `status`. When a probe FAILS the scan reports
 * `unknown` and hands back the remembered sessions rather than an empty list:
 * an empty list from a broken `ps` or `lsof` is indistinguishable from "no
 * Claude sessions are running", and a key that confidently paints "nothing
 * here" is worse than one that admits it doesn't know. The one probe whose
 * failure is deliberately tolerated is the shell-busy child probe — see the
 * comment at that call.
 *
 * The same concurrent burst also runs `claude agents --json` (found in one of
 * four fixed locations, see claude-agents.ts; ~0.12s) and merges Claude's own
 * report into each instance by pid. If the binary is missing, exits non-zero,
 * times out or prints something unusable, `snapshot.claudeAgents` says
 * "unavailable" with a reason and every instance carries `reported: null`;
 * `status` stays "ok" and the older signals decide state. The call is inside
 * the scan, so `fresh` scans ask the CLI again. LIMIT: the pgrep result and
 * the CLI listing are merged by pid alone; a pid freed and reused by another
 * claude inside the same few-millisecond burst could take the wrong report for
 * at most one tick.
 *
 * A caller that needs the machine's CURRENT state rather than a shared,
 * cached one (a key press about to act) passes `{ fresh: true }`. Fresh
 * bypasses three separate caches, all of them, or the option would lie about
 * how fresh the answer is: the 2s world-snapshot TTL, the in-flight-scan
 * join, and — easy to miss, and the reason a naive first cut of this
 * regressed freshness — the per-pid 60s cwd memo (see {@link refreshCwds}).
 */

import { execFile as nodeExecFile } from "node:child_process";

import {
	type AgentsSource,
	CLAUDE_AGENTS_ARGS,
	findClaudePath,
	parseClaudeAgents,
	reportedState,
} from "./claude-agents.js";
import {
	busyParentsFrom,
	type ClaudeInstance,
	claudesFrom,
	parseLsofCwds,
	parsePsProcs,
} from "./claude-project.js";
import { UTF8_ENV } from "./tmux-runner.js";

/** Minimal execFile shape we depend on (for test injection). */
export type ExecFileLike = (
	file: string,
	args: readonly string[],
	options: { timeout?: number; env?: NodeJS.ProcessEnv },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

export interface ClaudeScanOptions {
	/**
	 * Skip every cache and probe the machine now. Bypasses the 2s world-cache
	 * TTL, declines to join an in-flight scan (a slow scan already running
	 * cannot answer for "right now"), AND re-probes every live pid's cwd
	 * instead of trusting the 60s memo — omitting that third bypass would
	 * make a "fresh" scan answer from a cwd observed up to a minute ago, which
	 * is not fresh at all on the press path this option exists for.
	 */
	fresh?: boolean;
	/**
	 * Path of the `claude` binary asked for `agents --json`. Tests inject it so
	 * they never touch this machine's binaries. `undefined` means look it up
	 * with `findClaudePath()`; `null` means "no binary" and nothing is spawned.
	 */
	claudePath?: string | null;
}

/**
 * One scan's result plus how much to trust it.
 *
 * `status: "ok"` — the probes that establish PRESENCE and PROJECT answered, so
 * `instances` is the complete list of Claude sessions whose project folder could
 * be resolved, and an empty list genuinely means "none running".
 *
 * ONE probe is deliberately excluded from that guarantee: the shell-busy child
 * check (see the comment at its call). Its failure leaves `shellBusy` false on
 * an otherwise-good snapshot, so `status: "ok"` does NOT promise `shellBusy` is
 * accurate. The error is one-directional — it can only under-report a session as
 * idle that is in fact running a background shell, never invent a session or
 * empty a populated list — and two other signals (the terminal title, transcript
 * freshness) cover the same question.
 *
 * `status: "unknown"` — at least one probe failed, or at least one live
 * session could not be resolved to a project folder. `instances` is then the
 * PREVIOUS scan's sessions (possibly stale, possibly empty), never a fresh
 * negative. Callers must not read an empty list under this status as absence.
 */
export interface ClaudeScanSnapshot {
	status: "ok" | "unknown";
	instances: ClaudeInstance[];
	/**
	 * Whether `claude agents --json` answered: "ok" (parsed; each instance's
	 * `reported` is its listed state or null when unlisted), "unavailable" (no
	 * binary, non-zero exit, timeout, spawn error or unparsable output; `reason`
	 * says which; every `reported` is null) or "unasked" (no claude running, so
	 * the CLI was not spawned). It never changes `status`: presence and project
	 * come from pgrep/ps/lsof, so a broken CLI cannot hide a session.
	 */
	claudeAgents: { source: AgentsSource; reason: string };
}

const TIMEOUT_MS = 4000;

type RunResult = {
	ok: boolean;
	stdout: string;
	exitCode: number | null;
	/** Why the call failed: the timeout kill, a non-zero exit, or a spawn error. */
	errorKind: "none" | "timeout" | "exit" | "spawn";
};

function run(
	file: string,
	args: readonly string[],
	exec: ExecFileLike,
): Promise<RunResult> {
	return new Promise((resolve) => {
		exec(file, args, { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error, stdout) => {
			const e = error as { code?: unknown; killed?: unknown; signal?: unknown } | null;
			// A process cut short by the timeout is NOT reporting an exit status,
			// even though Node may still surface a numeric `code`.
			const terminated = e !== null && (e.killed === true || typeof e.signal === "string");
			const code = terminated ? null : e?.code;
			const errorKind: RunResult["errorKind"] =
				e === null ? "none" : terminated ? "timeout" : typeof code === "number" ? "exit" : "spawn";
			resolve({
				ok: error === null,
				stdout: String(stdout ?? ""),
				exitCode: typeof code === "number" ? code : null,
				errorKind,
			});
		});
	});
}

/** pgrep's documented contract: exit 1 means "nothing matched" — a definite,
 * trustworthy answer. Any other non-zero exit (or a signal/timeout, which is
 * normalised to a non-numeric code above) means the probe itself failed, and
 * must NOT be reported as "no Claude sessions are running". */
function pgrepFoundNothing(result: RunResult): boolean {
	return !result.ok && result.exitCode === 1 && result.stdout.trim() === "";
}

/** Discovery is pgrep-based: pgrep walks the process table at ~zero CPU
 * where a full `ps -axo` costs ~0.12s per call. Safe HERE because the plugin
 * is never an ancestor of a claude process (BSD pgrep omits its own
 * ancestors — that caveat applies to probes run from inside a session, not
 * to this plugin). All ps calls are then TARGETED (-p) at a handful of pids. */
export const PGREP_CLAUDE_ARGS = ["-x", "claude"];

export function claudeDetailArgs(pids: number[]): string[] {
	return ["-o", "pid=,ppid=,tty=,comm=", "-p", pids.join(",")];
}

export function childPidsArgs(pids: number[]): string[] {
	return ["-P", pids.join(",")];
}

/** Targeted argv read for shell-busy confirmation (few pids — cheap). */
export function confirmShellArgs(pids: number[]): string[] {
	return ["-o", "pid=,ppid=,command=", "-p", pids.join(",")];
}

/** A claude's cwd is effectively fixed for its lifetime; cache the lsof
 * lookups per pid. Tolerated staleness: 60s (documented, plain TTL — no
 * cleverness about invalidation it can't actually deliver), EXCEPT a `fresh`
 * scan, which re-probes every pid regardless of memo age (see
 * {@link refreshCwds}). */
const CWD_TTL_MS = 60_000;
const cwdCache = new Map<number, { cwd: string; at: number }>();

/** Shared snapshot for ALL pollers: both key types poll every few seconds
 * and would otherwise duplicate the scans. Deliberately LESS than the
 * pollers' own interval (2500ms, `POLL_MS` in ai-project.ts / focus-tmux.ts):
 * every action's tick must still land on a genuinely fresh scan of its own
 * rather than always inheriting one a neighbour happened to trigger a moment
 * earlier — raising this above the poll period would halve the effective
 * refresh rate. Do not "fix" this by raising it. */
const WORLD_TTL_MS = 2000;
let worldCache: { at: number; snapshot: ClaudeScanSnapshot } | null = null;
let worldInFlight: Promise<ClaudeScanSnapshot> | null = null;

/**
 * Guards which scan is allowed to publish to the shared cache.
 *
 * EXACT GUARANTEE: a scan that STARTED earlier can never overwrite the result
 * of one that started later. It does NOT guarantee the cached snapshot is the
 * latest observation of the world — a long scan that started later still
 * wins even if a faster, earlier-started scan finishes after it.
 *
 * Ordered by START time via a monotonic counter assigned at kickoff, not by
 * a `Date.now()` timestamp: two scans can start in the same millisecond, so
 * comparing wall-clock times says nothing reliable about which one actually
 * began later.
 */
let seq = 0;
let publishedSeq = 0;

export function lsofCwdArgs(pids: number[]): string[] {
	return ["-a", "-p", pids.join(","), "-d", "cwd", "-Fpn"];
}

/** All running Claude Code CLI instances with their ttys, project cwds, and
 * whether a shell tool is running under each — WITHOUT the trust channel.
 * Kept for callers that only ever act on sessions they actually found; prefer
 * {@link scanClaudeSnapshot} where an empty list would be painted as an
 * answer. TTL-cached so concurrent pollers share one scan; cwds cached per
 * pid (60s). */
export function scanClaudeInstances(
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
	options: ClaudeScanOptions = {},
): Promise<ClaudeInstance[]> {
	return scanClaudeSnapshot(exec, options).then((snapshot) => snapshot.instances);
}

/** The same scan, carrying whether its probes actually answered. */
export function scanClaudeSnapshot(
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
	options: ClaudeScanOptions = {},
): Promise<ClaudeScanSnapshot> {
	if (!options.fresh) {
		if (worldCache !== null && Date.now() - worldCache.at < WORLD_TTL_MS) {
			return Promise.resolve(worldCache.snapshot);
		}
		if (worldInFlight !== null) {
			return worldInFlight;
		}
	}
	const mySeq = ++seq;
	const p = doScan(exec, mySeq, options.fresh === true, options.claudePath);
	worldInFlight = p;
	void p.finally(() => {
		if (worldInFlight === p) worldInFlight = null;
	});
	return p;
}

/** Tests: drop the shared caches between cases. */
export function invalidateClaudeScan(): void {
	worldCache = null;
	worldInFlight = null;
	cwdCache.clear();
	// Do NOT reset `seq`. A scan already in flight keeps the sequence number it
	// took at entry, so zeroing the counter would let that older scan satisfy
	// `mySeq >= publishedSeq` afterwards and publish over a newer one — the
	// very stale-overwrite race this guard exists to close. Raising the
	// published watermark to the current sequence locks every in-flight scan
	// out instead, while the next scan (which takes ++seq) still gets through.
	publishedSeq = seq;
}

/** Tests: expire only the world snapshot, keeping the cwd cache warm. */
export function invalidateWorldCache(): void {
	worldCache = null;
	worldInFlight = null;
}

/**
 * Which claudes have a live shell-snapshot child right now?
 *
 * DELIBERATE: a failure here does NOT degrade the snapshot to "unknown". It
 * means "we don't know whether a backgrounded shell is running", not "no
 * session here" — the sessions and their project folders are established
 * elsewhere, and `shellBusy` only ever UPGRADES a session's face to "working"
 * (see `claudeState`). Degrading the whole snapshot would throw away correct
 * project identity for every key on the machine to protect one of three
 * "working" signals; the compensating signals — the braille/✳ terminal title
 * and the transcript freshness check — are read separately and still fire.
 * The cost is bounded and one-directional: a failed child probe can only
 * UNDER-report "working", never invent a session or claim a project is empty.
 */
async function shellBusyPids(
	claudePids: ReadonlySet<number>,
	exec: ExecFileLike,
): Promise<Set<number>> {
	const kids = await run("/usr/bin/pgrep", childPidsArgs([...claudePids]), exec);
	if (!kids.ok) return new Set();
	const children = kids.stdout
		.split("\n")
		.map((l) => Number.parseInt(l.trim(), 10))
		.filter((n) => Number.isFinite(n));
	if (children.length === 0) return new Set();
	const confirm = await run("/bin/ps", confirmShellArgs(children), exec);
	return confirm.ok ? busyParentsFrom(confirm.stdout) : new Set();
}

/**
 * Refresh the cwd memo for whichever pids need it, in one batched `lsof`
 * call. Returns false only when lsof itself failed: without cwds there is no
 * project binding at all, so the caller must downgrade the whole scan to
 * "unknown" rather than reporting an empty list.
 *
 * `fresh` (see A1 in the perf review): re-probes EVERY live pid, not just the
 * ones whose memo has aged past {@link CWD_TTL_MS}. The map is refreshed IN
 * PLACE rather than cleared — other concurrent pollers read it between
 * awaits, and clearing it would show them a hole that was never really empty.
 */
async function refreshCwds(
	claudes: ReadonlyArray<{ pid: number; tty: string }>,
	exec: ExecFileLike,
	now: number,
	fresh: boolean,
): Promise<boolean> {
	const need = fresh
		? claudes
		: claudes.filter((c) => {
				const hit = cwdCache.get(c.pid);
				return hit === undefined || now - hit.at >= CWD_TTL_MS;
			});
	if (need.length === 0) return true;
	// A FRESH scan must resolve identity from THIS probe alone. Dropping the
	// requested pids' memo entries first is the whole point: lsof can succeed
	// and still omit a pid, and without this the scan would silently fall back
	// to a cwd observed up to CWD_TTL_MS (60s) ago while reporting itself
	// fresh. A press acting on a 60-second-old project binding is exactly the
	// staleness `fresh` exists to eliminate.
	if (fresh) for (const c of need) cwdCache.delete(c.pid);
	const lsof = await run("/usr/sbin/lsof", lsofCwdArgs(need.map((p) => p.pid)), exec);
	// Without cwds there is no project binding at all, so a broken lsof would
	// empty the list — exactly the confident lie this status channel exists
	// to prevent.
	if (!lsof.ok) return false;
	for (const [pid, cwd] of parseLsofCwds(lsof.stdout)) cwdCache.set(pid, { cwd, at: now });
	return true;
}

const UNASKED: ClaudeScanSnapshot["claudeAgents"] = { source: "unasked", reason: "" };

type AgentsAnswer = {
	claudeAgents: ClaudeScanSnapshot["claudeAgents"];
	byPid: Map<number, { reported: ClaudeInstance["reported"]; waitingFor: string }>;
};

/**
 * Ask `claude agents --json` for Claude's own report. Never throws and never
 * affects the scan's `status`: any failure yields `unavailable` with a fixed
 * reason string (never CLI output, so no session data reaches a log).
 */
async function askClaudeAgents(claudePath: string | null, exec: ExecFileLike): Promise<AgentsAnswer> {
	const byPid: AgentsAnswer["byPid"] = new Map();
	const unavailable = (reason: string): AgentsAnswer => ({
		claudeAgents: { source: "unavailable", reason },
		byPid,
	});
	if (claudePath === null) return unavailable("no claude binary");
	const result = await run(claudePath, CLAUDE_AGENTS_ARGS, exec);
	if (!result.ok) {
		if (result.errorKind === "timeout") return unavailable("timeout");
		if (result.errorKind === "exit") return unavailable(`exit ${result.exitCode}`);
		return unavailable("spawn error");
	}
	const parsed = parseClaudeAgents(result.stdout);
	if (!parsed.ok) return unavailable(`unparsable: ${parsed.reason}`);
	for (const s of parsed.sessions) {
		byPid.set(s.pid, { reported: reportedState(s.status), waitingFor: s.waitingFor });
	}
	return { claudeAgents: { source: "ok", reason: "" }, byPid };
}

async function doScan(
	exec: ExecFileLike,
	mySeq: number,
	fresh: boolean,
	claudePathOption?: string | null,
): Promise<ClaudeScanSnapshot> {
	const now = Date.now();
	const pgrep = await run("/usr/bin/pgrep", PGREP_CLAUDE_ARGS, exec);
	if (pgrepFoundNothing(pgrep)) {
		return remember(now, mySeq, { status: "ok", instances: [], claudeAgents: UNASKED });
	}
	if (!pgrep.ok) return rememberUnknown(now, mySeq);
	const pids = pgrep.stdout
		.split("\n")
		.map((l) => Number.parseInt(l.trim(), 10))
		.filter((n) => Number.isFinite(n));
	if (pids.length === 0) return remember(now, mySeq, { status: "ok", instances: [], claudeAgents: UNASKED });
	const ps = await run("/bin/ps", claudeDetailArgs(pids), exec);
	if (!ps.ok) return rememberUnknown(now, mySeq);
	const claudes = claudesFrom(parsePsProcs(ps.stdout));
	if (claudes.length === 0) return remember(now, mySeq, { status: "ok", instances: [], claudeAgents: UNASKED });
	const claudePids = new Set(claudes.map((c) => c.pid));

	// The shell-busy child chain and the cwd lookup both depend only on the ps
	// above, so they run CONCURRENTLY instead of one waiting on the other.
	// The `claude agents --json` call joins the same burst (~0.12s). Like the
	// shell-busy probe, its failure does NOT degrade `status`: presence and
	// project are established elsewhere, and the report only supplies state.
	// It runs on `fresh` scans too, since it lives inside doScan.
	const claudePath = claudePathOption === undefined ? findClaudePath() : claudePathOption;
	const [busyPids, cwdsOk, agents] = await Promise.all([
		shellBusyPids(claudePids, exec),
		refreshCwds(claudes, exec, now, fresh),
		askClaudeAgents(claudePath, exec),
	]);
	if (!cwdsOk) return rememberUnknown(now, mySeq);

	for (const pid of [...cwdCache.keys()]) {
		if (!claudePids.has(pid)) cwdCache.delete(pid); // dead pids out
	}

	const instances = claudes
		.map((p) => ({
			pid: p.pid,
			tty: p.tty,
			cwd: cwdCache.get(p.pid)?.cwd ?? "",
			shellBusy: busyPids.has(p.pid),
			reported: agents.byPid.get(p.pid)?.reported ?? null,
			waitingFor: agents.byPid.get(p.pid)?.waitingFor ?? "",
		}))
		.filter((i) => i.cwd !== "");
	// A live claude whose cwd lsof did not report cannot be bound to a project,
	// so the list is not the whole truth even though every command succeeded.
	const incomplete = instances.length !== claudes.length;
	return remember(now, mySeq, {
		status: incomplete ? "unknown" : "ok",
		instances,
		claudeAgents: agents.claudeAgents,
	});
}

function remember(at: number, mySeq: number, snapshot: ClaudeScanSnapshot): ClaudeScanSnapshot {
	if (mySeq >= publishedSeq) {
		worldCache = { at, snapshot };
		publishedSeq = mySeq;
	}
	return snapshot;
}

/** Downgrade rather than invent: keep the last scan's sessions (they are the
 * best available guess at what is running) and let `status` say they are not
 * fresh. `shellBusy` is carried over as last known — there is no "unknown"
 * value for a boolean, and substituting `false` would fabricate the negative
 * this whole channel exists to avoid. */
function rememberUnknown(at: number, mySeq: number): ClaudeScanSnapshot {
	const stale = worldCache?.snapshot.instances.map((instance) => ({ ...instance })) ?? [];
	// `claudeAgents` and each instance's `reported`/`waitingFor` are carried as
	// last known, like `shellBusy`.
	const claudeAgents = worldCache?.snapshot.claudeAgents ?? UNASKED;
	return remember(at, mySeq, { status: "unknown", instances: stale, claudeAgents });
}

/** Is a process with exactly this name running? (pgrep -x; used to avoid
 * AppleScript-launching a terminal app that isn't open.) */
export function processRunning(
	name: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<boolean> {
	return new Promise((resolve) => {
		exec("/usr/bin/pgrep", ["-x", name], { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error) => {
			resolve(!error);
		});
	});
}
