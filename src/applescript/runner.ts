/**
 * Thin osascript runner, shared by all actions. The `exec` dependency is
 * injectable so tests can mock it without spawning processes. Error
 * classification distinguishes the two macOS privacy denials we can hit —
 * Automation (Apple Events) and Accessibility (assistive/keystroke) — from a
 * generic failure, so each action can guide the user to the right setting.
 */

import { execFile as nodeExecFile } from "node:child_process";

import { UTF8_ENV } from "../mac/tmux-runner.js";

export type ErrorCode = "success" | "permission-denied" | "error";

export interface RunResult {
	ok: boolean;
	code: ErrorCode;
	stdout: string;
	stderr: string;
}

/** Minimal shape of child_process.execFile we depend on (for test injection). */
export type ExecFileLike = (
	file: string,
	args: readonly string[],
	options: { timeout?: number; env?: NodeJS.ProcessEnv },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/**
 * Classify osascript stderr. macOS reports blocked automation with error
 * -1743 ("Not authorized to send Apple events"); blocked keystroke/assistive
 * access (Accessibility) with -1719 ("not allowed assistive access"); -10004
 * can also appear when a target app isn't reachable under sandboxed automation.
 */
export function classifyError(stderr: string): Exclude<ErrorCode, "success"> {
	if (
		/-1743|-1719|-10004|not authori[sz]ed to send apple events|not allowed assistive/i.test(stderr)
	) {
		return "permission-denied";
	}
	return "error";
}

/** Minimal shape of the ChildProcess `execFile` returns — just enough to pipe
 * `stdin` to it before its callback fires. Real Node processes satisfy this;
 * tests inject a fake exec whose return value may omit `stdin` entirely. */
type ChildWithStdin = {
	stdin?: { write(chunk: string, encoding: string): unknown; end(): unknown } | null;
};

/**
 * Run osascript with the given args, optionally piping `stdin` to it first.
 * `stdin` is the ONLY safe way to hand a script arbitrary-length user text:
 * unlike an argv element it has no OS argument-length ceiling, and unlike
 * script-source interpolation it can never become code — the script must
 * explicitly choose to read it (see `runJxaWithStdin`).
 */
function runOsascript(
	args: readonly string[],
	exec: ExecFileLike,
	stdin?: string,
): Promise<RunResult> {
	return new Promise((resolve) => {
		const child = exec("/usr/bin/osascript", args, { timeout: 8000, env: UTF8_ENV }, (error, stdout, stderr) => {
			const out = String(stdout ?? "");
			const err = String(stderr ?? "");
			if (error) {
				resolve({ ok: false, code: classifyError(err || String(error)), stdout: out, stderr: err });
			} else {
				resolve({ ok: true, code: "success", stdout: out, stderr: err });
			}
		});
		if (stdin !== undefined) {
			const proc = child as ChildWithStdin;
			proc.stdin?.write(stdin, "utf8");
			proc.stdin?.end();
		}
	});
}

export function runAppleScript(
	script: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return runOsascript(["-e", script], exec);
}

/** Run an AppleScript with ARGUMENTS, delivered to its `on run argv` handler.
 * The only safe way to hand user text to AppleScript: arguments are data, never
 * source, so a snippet containing quotes, backslashes or `& do shell script`
 * cannot become code. NEVER interpolate user text into a script string. */
export function runAppleScriptWithArgs(
	script: string,
	args: readonly string[],
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return runOsascript(["-e", script, "--", ...args], exec);
}

/**
 * Run a JXA (JavaScript for Automation) script. Same osascript binary, but the
 * ObjC bridge lets scripts hit AppKit directly (e.g. NSWorkspace) instead of
 * Apple-Eventing the System Events process — ~5x faster for process queries.
 */
export function runJxa(
	script: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return runOsascript(["-l", "JavaScript", "-e", script], exec);
}

/** Run a JXA script with `on run`/`function run(argv)` ARGUMENTS — the JXA
 * counterpart to {@link runAppleScriptWithArgs}: arguments are data delivered
 * via argv, never interpolated into the script source. */
export function runJxaWithArgs(
	script: string,
	args: readonly string[],
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return runOsascript(["-l", "JavaScript", "-e", script, "--", ...args], exec);
}

/**
 * Run a JXA script with BOTH argv arguments and STDIN.
 *
 * Exists for the one script that needs both: the snippet text is far too large
 * and too sensitive for argv, while the pasteboard state the script must check
 * against is a bare integer that has no business travelling through stdin
 * alongside the payload.
 */
export function runJxaWithArgsAndStdin(
	script: string,
	args: readonly string[],
	input: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return runOsascript(["-l", "JavaScript", "-e", script, "--", ...args], exec, input);
}

/**
 * Run a JXA script, piping `input` to its STDIN. The script reads it itself
 * (typically via `NSFileHandle.fileHandleWithStandardInput`) — this is the
 * preferred way to hand a script large or sensitive user text: it has no
 * OS argv-length ceiling the way `runJxaWithArgs` does, and — like argv —
 * it is delivered as data the script must opt into reading, never as script
 * source.
 */
export function runJxaWithStdin(
	script: string,
	input: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return runOsascript(["-l", "JavaScript", "-e", script], exec, input);
}
