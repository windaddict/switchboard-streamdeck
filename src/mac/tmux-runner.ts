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
	options: { timeout?: number },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/** Run tmux with the given args and capture stdout/stderr. */
export function runTmux(
	args: readonly string[],
	tmuxPath: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<TmuxResult> {
	return new Promise((resolve) => {
		exec(tmuxPath, args, { timeout: 5000 }, (error, stdout, stderr) => {
			resolve({
				ok: !error,
				stdout: String(stdout ?? ""),
				stderr: String(stderr ?? ""),
			});
		});
	});
}
