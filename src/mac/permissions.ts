/**
 * Queries macOS Accessibility (AX) trust via the native `axcheck` helper, so
 * the property inspector can show a live "permission not granted" warning. The
 * helper has no side effects and does not prompt. `exec` is injectable for
 * tests.
 *
 * Resolves `false` only when the helper definitively reports `untrusted`. A
 * spawn error / missing binary / unexpected output resolves `true` so an old
 * install (no helper) never raises a false alarm.
 */

import { execFile as nodeExecFile } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Resolve the axcheck binary path relative to the bundled plugin entry point. */
export function axcheckHelperPath(baseUrl: string): string {
	return fileURLToPath(new URL("macos/axcheck", baseUrl));
}

/** Minimal execFile shape we depend on (for test injection). */
export type ExecFileLike = (
	file: string,
	args: readonly string[],
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/** True when the process has Accessibility trust (or the check is inconclusive). */
export function checkAccessibility(
	baseUrl: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<boolean> {
	const bin = axcheckHelperPath(baseUrl);
	return new Promise((resolve) => {
		exec(bin, [], (_error, stdout) => {
			// Only a definitive "untrusted" raises the warning; anything else
			// (trusted, error, missing helper) is treated as granted to avoid
			// false positives on installs without the helper.
			resolve(String(stdout ?? "").trim() !== "untrusted");
		});
	});
}
