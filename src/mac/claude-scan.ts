/**
 * Scans the machine for running Claude Code CLI instances: `ps` enumerates
 * pids+ttys (pgrep misses ancestors), one batched `lsof` maps every pid to
 * its project cwd (~0.06s total, measured). Absolute binary paths — Stream
 * Deck launches plugins with a minimal PATH. `exec` injectable for tests.
 */

import { execFile as nodeExecFile } from "node:child_process";

import { type ClaudeInstance, parseLsofCwds, parsePsWorld } from "./claude-project.js";
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

export const PS_CLAUDE_ARGS = ["-axo", "pid=,ppid=,tty=,command="];

export function lsofCwdArgs(pids: number[]): string[] {
	return ["-a", "-p", pids.join(","), "-d", "cwd", "-Fpn"];
}

/** All running Claude Code CLI instances with their ttys, project cwds, and
 * whether a shell tool is running under each. */
export async function scanClaudeInstances(
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<ClaudeInstance[]> {
	const ps = await run("/bin/ps", PS_CLAUDE_ARGS, exec);
	const world = parsePsWorld(ps);
	if (world.claudes.length === 0) return [];

	const lsof = await run(
		"/usr/sbin/lsof",
		lsofCwdArgs(world.claudes.map((p) => p.pid)),
		exec,
	);
	const cwds = parseLsofCwds(lsof);
	return world.claudes
		.map((p) => ({
			pid: p.pid,
			tty: p.tty,
			cwd: cwds.get(p.pid) ?? "",
			shellBusy: world.busyPids.has(p.pid),
		}))
		.filter((i) => i.cwd !== "");
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
