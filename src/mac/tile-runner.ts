/**
 * Invokes the native `tile` helper (bin/macos/tile) that moves+resizes the
 * focused window to a normalized rectangle of its screen's visible frame via
 * the Accessibility API. The helper path is derived from a base URL (normally
 * `import.meta.url` of the bundled plugin) so it resolves inside the installed
 * plugin folder. `exec` is injectable for tests.
 *
 * The helper takes four fractions (0..1): x y w h, where y is measured from the
 * top of the visible frame. It prints "untrusted" to stderr when it lacks
 * Accessibility (the move is a no-op in that case).
 */

import { execFile as nodeExecFile } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { Cell } from "./tile.js";

/** Resolve the helper binary path relative to the bundled plugin entry point. */
export function tileHelperPath(baseUrl: string): string {
	return fileURLToPath(new URL("macos/tile", baseUrl));
}

export interface TileResult {
	/** The helper ran without a spawn error. */
	ok: boolean;
	/** False when the helper reported it lacks Accessibility (move dropped). */
	trusted: boolean;
}

/** Minimal execFile shape we depend on (for test injection). */
export type ExecFileLike = (
	file: string,
	args: readonly string[],
	options: { timeout?: number },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/** A stuck helper must never leave a dial handler pending forever. */
const HELPER_TIMEOUT_MS = 4000;

/** Round to a few decimals so the CLI args stay short and stable. */
function frac(n: number): string {
	return (Math.round(n * 1e4) / 1e4).toString();
}

/**
 * Apply a normalized cell to the focused window via the helper.
 *
 * The (notarized, unchangeable-without-re-notarizing) helper always exits 0
 * and reports operational failures — "no-frontmost", "no-window", "no-screen",
 * bad usage — on stderr. Any non-empty stderr therefore means the window did
 * NOT move; `untrusted` additionally means Accessibility is missing. Callers
 * must not persist or render the new position unless `ok` is true.
 */
export function runTile(
	cell: Cell,
	baseUrl: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<TileResult> {
	const bin = tileHelperPath(baseUrl);
	const args = [frac(cell.x), frac(cell.y), frac(cell.w), frac(cell.h)];
	return new Promise((resolve) => {
		exec(bin, args, { timeout: HELPER_TIMEOUT_MS }, (error, _stdout, stderr) => {
			const err = String(stderr ?? "").trim();
			const trusted = !/untrusted/i.test(err);
			resolve({ ok: !error && err === "", trusted });
		});
	});
}
