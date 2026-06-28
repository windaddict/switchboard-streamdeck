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
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

/** Round to a few decimals so the CLI args stay short and stable. */
function frac(n: number): string {
	return (Math.round(n * 1e4) / 1e4).toString();
}

/** Apply a normalized cell to the focused window via the helper. */
export function runTile(
	cell: Cell,
	baseUrl: string,
	exec: ExecFileLike = nodeExecFile as unknown as ExecFileLike,
): Promise<TileResult> {
	const bin = tileHelperPath(baseUrl);
	const args = [frac(cell.x), frac(cell.y), frac(cell.w), frac(cell.h)];
	return new Promise((resolve) => {
		exec(bin, args, (error, _stdout, stderr) => {
			const trusted = !/untrusted/i.test(String(stderr ?? ""));
			resolve({ ok: !error, trusted });
		});
	});
}
