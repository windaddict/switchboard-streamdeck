/**
 * Spawns the tmux CLI. Stream Deck launches plugins with a minimal PATH that
 * usually lacks Homebrew, so we resolve an absolute tmux path. `exec`/`exists`
 * are injectable for tests.
 */

import { execFile as nodeExecFile } from "node:child_process";
import { existsSync as nodeExistsSync } from "node:fs";

const TMUX_CANDIDATES = ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"];

/** First tmux binary that exists, falling back to bare "tmux" (PATH lookup). */
export function findTmuxPath(exists: (p: string) => boolean = nodeExistsSync): string {
	return TMUX_CANDIDATES.find(exists) ?? "tmux";
}

/** tmux args that emit one window per line as `session|index|active|name`.
 * The NAME is last: window names may legally contain `|`, so every fixed-width
 * field comes first and the parser joins the remainder back into the name. */
export const LIST_WINDOWS_ARGS = [
	"list-windows",
	"-a",
	"-F",
	"#{session_name}|#{window_index}|#{window_active}|#{window_name}",
];

/** tmux args that emit one client per line as `tty|session`. */
export const LIST_CLIENTS_ARGS = ["list-clients", "-F", "#{client_tty}|#{client_session}"];

export interface TmuxResult {
	ok: boolean;
	stdout: string;
	stderr: string;
}

/** Minimal execFile shape we depend on (for test injection). */
export type ExecFileLike = (
	file: string,
	args: readonly string[],
	options: { timeout?: number; env?: NodeJS.ProcessEnv },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/**
 * Stream Deck launches plugins with a minimal environment — no LANG/LC_ALL —
 * so child processes run in the C locale and tmux TRANSLITERATES every
 * non-ASCII character in its output to "_": the Claude braille/✳ title
 * markers arrived as underscores and every session read "waiting" on-device
 * while every UTF-8 shell probe looked correct. Force UTF-8 for all children.
 */
export const UTF8_ENV: NodeJS.ProcessEnv = { ...process.env, LC_ALL: "en_US.UTF-8" };

/** Run tmux with the given args and capture stdout/stderr. */
export function runTmux(
	args: readonly string[],
	tmuxPath: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<TmuxResult> {
	return new Promise((resolve) => {
		exec(tmuxPath, args, { timeout: 5000, env: UTF8_ENV }, (error, stdout, stderr) => {
			resolve({
				ok: !error,
				stdout: String(stdout ?? ""),
				stderr: String(stderr ?? ""),
			});
		});
	});
}
