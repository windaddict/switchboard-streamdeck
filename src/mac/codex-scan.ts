/**
 * Bounded, cached scan of interactive Codex CLI sessions.
 *
 * A caller on the press path that needs the machine's state right now, not a
 * poll-old shared one, passes `{ fresh: true }` — see {@link CodexScanOptions}.
 * Publication to the shared cache is guarded by a monotonic start-sequence
 * counter, not a wall-clock timestamp: see the exact guarantee documented at
 * `seq`/`publishedSeq` in claude-scan.ts, which applies here unchanged.
 */

import { execFile as nodeExecFile } from "node:child_process";
import { open, realpath } from "node:fs/promises";

import {
	codexStateFromRolloutLines,
	codexRolloutOriginator,
	type CodexInstance,
	isInteractiveCodex,
	isRolloutPath,
	parseCodexProcesses,
	parseLsofEntries,
	rolloutSessionId,
} from "./codex-project.js";
import { UTF8_ENV } from "./tmux-runner.js";

export type CodexExecFileLike = (
	file: string,
	args: readonly string[],
	options: { timeout?: number; env?: NodeJS.ProcessEnv },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

const TIMEOUT_MS = 4000;
/** Shared across every poller; deliberately LESS than the pollers' own
 * interval (2500ms) so each action's tick still lands on a genuinely fresh
 * scan rather than always inheriting one a neighbour happened to trigger a
 * moment earlier. Raising this above the poll period would halve the
 * effective refresh rate — do not "fix" it. */
const WORLD_TTL_MS = 2000;
const TAIL_BYTES = 1024 * 1024;
const HEAD_BYTES = 64 * 1024;
export interface CodexScanSnapshot {
	status: "ok" | "unknown";
	instances: CodexInstance[];
}

export interface CodexScanOptions {
	/** Skip the world-cache TTL and decline to join an in-flight scan — a
	 * scan already running cannot answer for "right now". Codex has no
	 * separate per-pid memo to bypass (unlike Claude's cwd cache): every scan
	 * already re-runs lsof for every candidate pid. */
	fresh?: boolean;
}

let cache: { at: number; snapshot: CodexScanSnapshot } | null = null;
let inFlight: Promise<CodexScanSnapshot> | null = null;
/** Monotonic start-sequence guard against a scan that started EARLIER
 * publishing over one that started LATER — see the exact guarantee at the
 * matching pair in claude-scan.ts. Not a wall-clock timestamp: two scans can
 * start in the same millisecond. */
let seq = 0;
let publishedSeq = 0;

function run(file: string, args: readonly string[], exec: CodexExecFileLike): Promise<{ ok: boolean; stdout: string }> {
	return new Promise((resolve) => {
		exec(file, args, { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error, stdout) => resolve({ ok: error === null, stdout: String(stdout ?? "") }));
	});
}

export function codexPsArgs(pids: number[]): string[] {
	return ["-o", "pid=,tty=,comm=,args=", "-p", pids.join(",")];
}

export function codexLsofArgs(pids: number[]): string[] {
	return ["-nP", "-a", "-p", pids.join(","), "-Fpcfn"];
}

async function rolloutLines(path: string): Promise<string[]> {
	try {
		const fh = await open(path, "r");
		try {
			const size = (await fh.stat()).size;
			const headLength = Math.min(size, HEAD_BYTES);
			const head = Buffer.alloc(headLength);
			await fh.read(head, 0, headLength, 0);
			const tailLength = Math.min(size, TAIL_BYTES);
			const offset = size - tailLength;
			const tail = Buffer.alloc(tailLength);
			await fh.read(tail, 0, tailLength, offset);
			const headLines = head.toString("utf8").split("\n");
			headLines.pop(); // possibly partial final head record
			const tailLines = tail.toString("utf8").split("\n");
			if (offset > 0) tailLines.shift();
			return [...headLines, ...tailLines].filter((line) => line.trim() !== "");
		} finally {
			await fh.close();
		}
	} catch {
		return [];
	}
}

export function invalidateCodexScan(): void {
	cache = null;
	inFlight = null;
	// Do NOT reset `seq` — an in-flight scan keeps the sequence it took at entry,
	// so zeroing the counter would let it publish over a newer scan afterwards.
	// Raising the watermark locks in-flight scans out; the next scan (++seq) passes.
	publishedSeq = seq;
}

export function scanCodexInstances(
	exec: CodexExecFileLike = nodeExecFile as unknown as CodexExecFileLike,
): Promise<CodexInstance[]> {
	return scanCodexSnapshot(exec).then((snapshot) => snapshot.instances);
}

export function scanCodexSnapshot(
	exec: CodexExecFileLike = nodeExecFile as unknown as CodexExecFileLike,
	options: CodexScanOptions = {},
): Promise<CodexScanSnapshot> {
	if (!options.fresh) {
		if (cache !== null && Date.now() - cache.at < WORLD_TTL_MS) return Promise.resolve(cache.snapshot);
		if (inFlight !== null) return inFlight;
	}
	const mySeq = ++seq;
	const p = doScan(exec, mySeq);
	inFlight = p;
	void p.finally(() => { if (inFlight === p) inFlight = null; });
	return p;
}

async function doScan(exec: CodexExecFileLike, mySeq: number): Promise<CodexScanSnapshot> {
	const now = Date.now();
	const pgrep = await run("/usr/bin/pgrep", ["-x", "codex"], exec);
	if (!pgrep.ok) return rememberUnknown(now, mySeq);
	const pids = pgrep.stdout.split("\n").map((s) => Number.parseInt(s.trim(), 10)).filter(Number.isFinite);
	if (pids.length === 0) return remember(now, mySeq, { status: "ok", instances: [] });
	const ps = await run("/bin/ps", codexPsArgs(pids), exec);
	if (!ps.ok) return rememberUnknown(now, mySeq);
	const processes = parseCodexProcesses(ps.stdout).filter(isInteractiveCodex);
	if (processes.length === 0) return remember(now, mySeq, { status: "ok", instances: [] });
	const lsof = await run("/usr/sbin/lsof", codexLsofArgs(processes.map((p) => p.pid)), exec);
	if (!lsof.ok) return rememberUnknown(now, mySeq);
	const entries = parseLsofEntries(lsof.stdout);
	let incomplete = false;
	const instances = await Promise.all(processes.map(async (process) => {
		const mine = entries.filter((e) => e.pid === process.pid);
		const cwdRaw = mine.find((e) => e.fd === "cwd")?.name ?? "";
		const rolloutPath = mine.find((e) => isRolloutPath(e.name))?.name ?? "";
		if (cwdRaw === "" || rolloutPath === "") { incomplete = true; return null; }
		let cwd = cwdRaw;
		try { cwd = await realpath(cwdRaw); } catch { /* process may exit mid-scan */ }
		const lines = await rolloutLines(rolloutPath);
		const originator = codexRolloutOriginator(lines);
		if (originator !== "codex-tui") {
			// A KNOWN non-tui originator is a clean negative: this is a `codex
			// exec` job or similar, correctly not a target. An EMPTY one means
			// the rollout could not be read or carried no session_meta — we
			// failed to classify a live process, and unlike Cursor's
			// never-prompted case that is not a normal state, so it stays an
			// incomplete observation rather than being reported as a clean scan.
			if (originator === "") incomplete = true;
			return null;
		}
		return {
			pid: process.pid,
			tty: process.tty.startsWith("/dev/") ? process.tty : `/dev/${process.tty}`,
			cwd,
			rolloutPath,
			sessionId: rolloutSessionId(rolloutPath),
			state: codexStateFromRolloutLines(lines),
		} satisfies CodexInstance;
	}));
	return remember(now, mySeq, { status: incomplete ? "unknown" : "ok", instances: instances.filter((i): i is CodexInstance => i !== null) });
}

/** EXACT GUARANTEE (mirrors claude-scan.ts): a scan that started earlier can
 * never overwrite the result of one that started later, ordered by a
 * monotonic start sequence rather than a timestamp. It does NOT guarantee the
 * cache holds the latest observation of the world — a long scan that started
 * later still wins even if a faster, earlier scan finishes after it. */
function remember(at: number, mySeq: number, snapshot: CodexScanSnapshot): CodexScanSnapshot {
	if (mySeq >= publishedSeq) {
		cache = { at, snapshot };
		publishedSeq = mySeq;
	}
	return snapshot;
}

function rememberUnknown(at: number, mySeq: number): CodexScanSnapshot {
	const stale = cache?.snapshot.instances.map((instance) => ({ ...instance, state: "unknown" as const })) ?? [];
	return remember(at, mySeq, { status: "unknown", instances: stale });
}
