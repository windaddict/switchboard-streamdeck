/** Bounded, cached scan of interactive Codex CLI sessions. */

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
const WORLD_TTL_MS = 2000;
const TAIL_BYTES = 1024 * 1024;
const HEAD_BYTES = 64 * 1024;
export interface CodexScanSnapshot {
	status: "ok" | "unknown";
	instances: CodexInstance[];
}
let cache: { at: number; snapshot: CodexScanSnapshot } | null = null;
let inFlight: Promise<CodexScanSnapshot> | null = null;

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
}

export function scanCodexInstances(
	exec: CodexExecFileLike = nodeExecFile as unknown as CodexExecFileLike,
): Promise<CodexInstance[]> {
	return scanCodexSnapshot(exec).then((snapshot) => snapshot.instances);
}

export function scanCodexSnapshot(
	exec: CodexExecFileLike = nodeExecFile as unknown as CodexExecFileLike,
): Promise<CodexScanSnapshot> {
	if (cache !== null && Date.now() - cache.at < WORLD_TTL_MS) return Promise.resolve(cache.snapshot);
	if (inFlight !== null) return inFlight;
	const p = doScan(exec);
	inFlight = p;
	void p.finally(() => { if (inFlight === p) inFlight = null; });
	return p;
}

async function doScan(exec: CodexExecFileLike): Promise<CodexScanSnapshot> {
	const now = Date.now();
	const pgrep = await run("/usr/bin/pgrep", ["-x", "codex"], exec);
	if (!pgrep.ok) return rememberUnknown(now);
	const pids = pgrep.stdout.split("\n").map((s) => Number.parseInt(s.trim(), 10)).filter(Number.isFinite);
	if (pids.length === 0) return remember(now, { status: "ok", instances: [] });
	const ps = await run("/bin/ps", codexPsArgs(pids), exec);
	if (!ps.ok) return rememberUnknown(now);
	const processes = parseCodexProcesses(ps.stdout).filter(isInteractiveCodex);
	if (processes.length === 0) return remember(now, { status: "ok", instances: [] });
	const lsof = await run("/usr/sbin/lsof", codexLsofArgs(processes.map((p) => p.pid)), exec);
	if (!lsof.ok) return rememberUnknown(now);
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
	return remember(now, { status: incomplete ? "unknown" : "ok", instances: instances.filter((i): i is CodexInstance => i !== null) });
}

function remember(at: number, snapshot: CodexScanSnapshot): CodexScanSnapshot {
	cache = { at, snapshot };
	return snapshot;
}

function rememberUnknown(at: number): CodexScanSnapshot {
	const stale = cache?.snapshot.instances.map((instance) => ({ ...instance, state: "unknown" as const })) ?? [];
	return remember(at, { status: "unknown", instances: stale });
}
