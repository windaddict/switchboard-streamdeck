/**
 * Scans the machine for running Claude Code CLI instances: `ps` enumerates
 * pids+ttys (pgrep misses ancestors), one batched `lsof` maps every pid to
 * its project cwd (~0.06s total, measured). Absolute binary paths — Stream
 * Deck launches plugins with a minimal PATH. `exec` injectable for tests.
 */

import { execFile as nodeExecFile } from "node:child_process";

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

const TIMEOUT_MS = 4000;

function run(
	file: string,
	args: readonly string[],
	exec: ExecFileLike,
): Promise<string> {
	return new Promise((resolve) => {
		exec(file, args, { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error, stdout) => {
			resolve(error ? "" : String(stdout ?? ""));
		});
	});
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
 * cleverness about invalidation it can't actually deliver). */
const CWD_TTL_MS = 60_000;
const cwdCache = new Map<number, { cwd: string; at: number }>();

/** Shared snapshot for ALL pollers: both key types poll every few seconds
 * and would otherwise duplicate the scans. */
const WORLD_TTL_MS = 2000;
let worldCache: { at: number; instances: ClaudeInstance[] } | null = null;
let worldInFlight: Promise<ClaudeInstance[]> | null = null;

export function lsofCwdArgs(pids: number[]): string[] {
	return ["-a", "-p", pids.join(","), "-d", "cwd", "-Fpn"];
}

/** All running Claude Code CLI instances with their ttys, project cwds, and
 * whether a shell tool is running under each. TTL-cached so concurrent
 * pollers share one scan; cwds cached per pid (60s). */
export function scanClaudeInstances(
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<ClaudeInstance[]> {
	if (worldCache !== null && Date.now() - worldCache.at < WORLD_TTL_MS) {
		return Promise.resolve(worldCache.instances);
	}
	if (worldInFlight !== null) {
		return worldInFlight;
	}
	const p = doScan(exec);
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
}

/** Tests: expire only the world snapshot, keeping the cwd cache warm. */
export function invalidateWorldCache(): void {
	worldCache = null;
	worldInFlight = null;
}

async function doScan(exec: ExecFileLike): Promise<ClaudeInstance[]> {
	const now = Date.now();
	const pidsOut = await run("/usr/bin/pgrep", PGREP_CLAUDE_ARGS, exec);
	const pids = pidsOut
		.split("\n")
		.map((l) => Number.parseInt(l.trim(), 10))
		.filter((n) => Number.isFinite(n));
	if (pids.length === 0) {
		worldCache = { at: now, instances: [] };
		return [];
	}
	const procs = parsePsProcs(await run("/bin/ps", claudeDetailArgs(pids), exec));
	const claudes = claudesFrom(procs);
	if (claudes.length === 0) {
		worldCache = { at: now, instances: [] };
		return [];
	}
	const claudePids = new Set(claudes.map((c) => c.pid));

	// Targeted argv confirm: which claudes have a live shell-snapshot child?
	const kidsOut = await run("/usr/bin/pgrep", childPidsArgs([...claudePids]), exec);
	const children = kidsOut
		.split("\n")
		.map((l) => Number.parseInt(l.trim(), 10))
		.filter((n) => Number.isFinite(n));
	let busyPids = new Set<number>();
	if (children.length > 0) {
		busyPids = busyParentsFrom(await run("/bin/ps", confirmShellArgs(children), exec));
	}

	// Phase 2b (cwds): lsof only for pids missing a fresh cache entry.
	const need = claudes.filter((c) => {
		const hit = cwdCache.get(c.pid);
		return hit === undefined || now - hit.at >= CWD_TTL_MS;
	});
	if (need.length > 0) {
		const cwds = parseLsofCwds(
			await run("/usr/sbin/lsof", lsofCwdArgs(need.map((p) => p.pid)), exec),
		);
		for (const [pid, cwd] of cwds) cwdCache.set(pid, { cwd, at: now });
	}
	for (const pid of [...cwdCache.keys()]) {
		if (!claudePids.has(pid)) cwdCache.delete(pid); // dead pids out
	}

	const instances = claudes
		.map((p) => ({
			pid: p.pid,
			tty: p.tty,
			cwd: cwdCache.get(p.pid)?.cwd ?? "",
			shellBusy: busyPids.has(p.pid),
		}))
		.filter((i) => i.cwd !== "");
	worldCache = { at: now, instances };
	return instances;
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
