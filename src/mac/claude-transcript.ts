/**
 * Freshness of a project's newest Claude Code transcript. Sessions append to
 * ~/.claude/projects/<slug>/<session>.jsonl while working; the newest file's
 * mtime goes stale within seconds of the session going idle (verified live).
 * Fully async and batch-bounded — this runs inside the shared poll of a
 * plugin process that serves every key and dial.
 */

import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { projectSlug } from "./claude-project.js";

const BATCH = 64;

/** Age in ms of the newest .jsonl transcript for the project, or null when
 * the project has no transcript directory / no transcripts. */
export async function newestTranscriptAgeMs(
	projectPath: string,
	now: number = Date.now(),
	base: string = join(homedir(), ".claude", "projects"),
): Promise<number | null> {
	const dir = join(base, projectSlug(projectPath));
	try {
		const names = (await readdir(dir)).filter((n) => n.endsWith(".jsonl"));
		let newest = Number.NEGATIVE_INFINITY;
		for (let i = 0; i < names.length; i += BATCH) {
			const mtimes = await Promise.all(
				names.slice(i, i + BATCH).map(async (n) => {
					try {
						return (await stat(join(dir, n))).mtimeMs;
					} catch {
						return null; // removed mid-scan
					}
				}),
			);
			for (const m of mtimes) {
				if (m !== null && m > newest) newest = m;
			}
		}
		return newest === Number.NEGATIVE_INFINITY ? null : Math.max(0, now - newest);
	} catch {
		return null;
	}
}
