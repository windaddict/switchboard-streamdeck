/**
 * Invokes the native `scroll` helper (bin/macos/scroll) that posts a real
 * CGScrollWheel event. The helper path is derived from a base URL (normally
 * `import.meta.url` of the bundled plugin) so it resolves inside the installed
 * plugin folder. `exec` is injectable for tests.
 */

import { execFile as nodeExecFile } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Resolve the helper binary path relative to the bundled plugin entry point. */
export function scrollHelperPath(baseUrl: string): string {
	return fileURLToPath(new URL("macos/scroll", baseUrl));
}

export interface ScrollResult {
	/** The helper ran without a spawn error. */
	ok: boolean;
	/** False when the helper reported it lacks Accessibility (events dropped). */
	trusted: boolean;
}

/** Minimal execFile shape we depend on (for test injection). */
export type ExecFileLike = (
	file: string,
	args: readonly string[],
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/** Post a signed line-count scroll via the helper. No-op for 0 lines. */
export function runScroll(
	lines: number,
	baseUrl: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<ScrollResult> {
	if (lines === 0) {
		return Promise.resolve({ ok: true, trusted: true });
	}
	const bin = scrollHelperPath(baseUrl);
	return new Promise((resolve) => {
		exec(bin, [String(lines)], (error, _stdout, stderr) => {
			const trusted = !/untrusted/i.test(String(stderr ?? ""));
			resolve({ ok: !error, trusted });
		});
	});
}
