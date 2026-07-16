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

function runOsascript(
	args: readonly string[],
	exec: ExecFileLike,
): Promise<RunResult> {
	return new Promise((resolve) => {
		exec("/usr/bin/osascript", args, { timeout: 8000, env: UTF8_ENV }, (error, stdout, stderr) => {
			const out = String(stdout ?? "");
			const err = String(stderr ?? "");
			if (error) {
				resolve({ ok: false, code: classifyError(err || String(error)), stdout: out, stderr: err });
			} else {
				resolve({ ok: true, code: "success", stdout: out, stderr: err });
			}
		});
	});
}

export function runAppleScript(
	script: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return runOsascript(["-e", script], exec);
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
