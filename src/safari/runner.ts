/**
 * Thin osascript runner. The `exec` dependency is injectable so tests can mock
 * it without spawning processes. Error classification distinguishes a macOS
 * Automation (TCC) denial from a generic failure so the UI can guide the user.
 */

import { execFile as nodeExecFile } from "node:child_process";

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
	options: { timeout?: number },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/**
 * Classify osascript stderr. macOS reports a blocked Apple Event with error
 * -1743 ("Not authorized to send Apple events"); -600/-10004 can also appear
 * when the target app isn't reachable under sandboxed automation.
 */
export function classifyError(stderr: string): Exclude<ErrorCode, "success"> {
	if (/-1743|-10004|not authori[sz]ed to send apple events|not allowed assistive/i.test(stderr)) {
		return "permission-denied";
	}
	return "error";
}

export function runAppleScript(
	script: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<RunResult> {
	return new Promise((resolve) => {
		exec("/usr/bin/osascript", ["-e", script], { timeout: 8000 }, (error, stdout, stderr) => {
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
