/**
 * Freshness of a project's newest Claude Code transcript. Sessions append to
 * ~/.claude/projects/<slug>/<session>.jsonl while working; the newest file's
 * mtime goes stale within seconds of the session going idle (verified live).
 * Fully async and batch-bounded — this runs inside the shared poll of a
 * plugin process that serves every key and dial.
 */

import { open as openFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { projectSlug } from "./claude-project.js";

const BATCH = 64;

/**
 * Is there an in-flight tool call in a transcript tail? Claude Code appends
 * the assistant turn (with tool_use blocks) when a tool STARTS and the
 * tool_result only when it finishes — so during a long shell command the file
 * goes quiet with an UNANSWERED tool_use in its tail. Matching tool_use ids
 * to tool_result ids is essential: other entry types (bridge-session,
 * attachment, system) interleave after the tool_use, so "look at the last
 * line" never works (verified against live transcripts). Keeps "working"
 * honest through long tools on hosts where no tmux title is readable —
 * agents don't need this, their subagent transcripts keep the directory
 * fresh. Pure; exported for tests.
 */
export function pendingToolUseInTail(lines: string[]): boolean {
	const uses = new Set<string>();
	const answered = new Set<string>();
	for (const line of lines) {
		// cheap pre-filter — most lines carry neither marker
		if (!line.includes('"tool_use') && !line.includes('"tool_result"')) continue;
		try {
			const entry = JSON.parse(line) as {
				message?: { content?: Array<{ type?: string; id?: string; tool_use_id?: string }> };
			};
			const content = entry.message?.content;
			if (!Array.isArray(content)) continue;
			for (const block of content) {
				if (block?.type === "tool_use" && typeof block.id === "string") uses.add(block.id);
				if (block?.type === "tool_result" && typeof block.tool_use_id === "string") {
					answered.add(block.tool_use_id);
				}
			}
		} catch {
			// partial line at the window edge — skip
		}
	}
	for (const id of uses) {
		if (!answered.has(id)) return true;
	}
	return false;
}

/** Read the newest transcript's tail window as complete lines. */
async function newestTranscriptTailLines(path: string): Promise<string[]> {
	try {
		const fh = await openFile(path, "r");
		try {
			const size = (await fh.stat()).size;
			const window = Math.min(size, 256 * 1024); // tool_use turns can be large
			const buf = Buffer.alloc(window);
			await fh.read(buf, 0, window, size - window);
			return buf
				.toString("utf8")
				.split("\n")
				.filter((l) => l.trim() !== "");
		} finally {
			await fh.close();
		}
	} catch {
		return [];
	}
}

export interface TranscriptState {
	ageMs: number | null;
	/** The newest transcript ends on an unanswered tool_use — a tool is running. */
	pendingToolUse: boolean;
}

/** Age AND pending-tool state of the project's newest transcript. */
export async function newestTranscriptState(
	projectPath: string,
	now: number = Date.now(),
	base: string = join(homedir(), ".claude", "projects"),
): Promise<TranscriptState> {
	const dir = join(base, projectSlug(projectPath));
	try {
		const names = (await readdir(dir)).filter((n) => n.endsWith(".jsonl"));
		let newest: { mtimeMs: number; path: string } | null = null;
		for (let i = 0; i < names.length; i += BATCH) {
			const batch = await Promise.all(
				names.slice(i, i + BATCH).map(async (n) => {
					try {
						const p = join(dir, n);
						return { mtimeMs: (await stat(p)).mtimeMs, path: p };
					} catch {
						return null;
					}
				}),
			);
			for (const e of batch) {
				if (e !== null && (newest === null || e.mtimeMs > newest.mtimeMs)) newest = e;
			}
		}
		if (newest === null) return { ageMs: null, pendingToolUse: false };
		return {
			ageMs: Math.max(0, now - newest.mtimeMs),
			pendingToolUse: pendingToolUseInTail(await newestTranscriptTailLines(newest.path)),
		};
	} catch {
		return { ageMs: null, pendingToolUse: false };
	}
}

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
