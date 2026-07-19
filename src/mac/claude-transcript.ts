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
 * Does the transcript tail show Claude OWING the next assistant turn — i.e.
 * actively working, even when the terminal title reads ✳ and the file is
 * frozen? The agent loop: a `user` message (a fresh prompt or a tool_result)
 * is answered by an `assistant` turn; if that turn ends WITHOUT a tool call
 * the conversation stops (idle); if it emits a tool_use, the tool runs and
 * appends a tool_result (another `user` message), looping back. So Claude is
 * working exactly when either:
 *   (a) the last conversational (user/assistant) entry is a `user` message —
 *       Claude has input it hasn't responded to yet (a prompt, or a just-
 *       completed tool's result). THIS is the "Brewing" state that ✳-title +
 *       frozen-transcript detection missed: after a tool result, Claude awaits
 *       the model API and writes nothing until the first token; or
 *   (b) an emitted tool_use has no matching tool_result (a tool is running).
 * It is IDLE only when the last conversational entry is an assistant turn
 * whose every tool_use is answered — Claude produced its final response and
 * stopped. Meta entries (bridge-session, attachment, system, …) interleave
 * and are ignored. Returns false on an unreadable/empty tail (let freshness
 * or the title decide). Pure; exported for tests.
 *
 * Crash-safety note: a dead session can also end on a dangling tool_result,
 * but the caller gates every "working" verdict on the claude PROCESS being
 * alive, so a crashed session reads "none", never a stuck "working".
 */
export function transcriptOwesResponse(lines: string[]): boolean {
	// Parse conversational entries in order, remembering each turn's tool_use
	// ids and role. Tool_use IDs are scoped to the CURRENT turn (entries after
	// the last `user` message): a tool from an EARLIER, already-advanced turn
	// is by the agent-loop invariant already answered, so accumulating uses
	// globally could wrongly flag an old call as pending.
	type Conv = { role: "user" | "assistant"; uses: string[] };
	const convs: Conv[] = [];
	for (const line of lines) {
		if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"')) continue;
		try {
			const entry = JSON.parse(line) as { type?: string; message?: { content?: unknown } };
			if (entry.type !== "user" && entry.type !== "assistant") continue;
			const uses: string[] = [];
			const content = entry.message?.content;
			if (Array.isArray(content)) {
				for (const block of content as Array<{ type?: string; id?: string; tool_use_id?: string }>) {
					if (block?.type === "tool_use" && typeof block.id === "string") uses.push(block.id);
				}
			}
			convs.push({ role: entry.type, uses });
		} catch {
			// partial line at the window edge — skip
		}
	}
	if (convs.length === 0) return false;
	// (a) the conversation ends on a user message — Claude owes the next turn
	// (a fresh prompt, or a just-completed tool's result = the Brewing state).
	if (convs[convs.length - 1].role === "user") return true;
	// (b) a tool is still running: an unanswered tool_use in the trailing
	// assistant turn(s) after the last user message. (Answered tools produce a
	// later user tool_result, which would have made the last role `user`.)
	const lastUserIdx = convs.map((c) => c.role).lastIndexOf("user");
	return convs.slice(lastUserIdx + 1).some((c) => c.uses.length > 0);
}

/** Read the newest transcript's tail window as COMPLETE lines. Tool_use /
 * tool_result turns can be large (a big file Read, verbose command output),
 * so the window is generous; when the head is truncated (offset > 0) the
 * first split fragment is a partial record and is dropped rather than fed to
 * the parser as if whole. A single record exceeding the window is possible
 * but extraordinarily rare (Claude Code caps tool output); the residual is a
 * transient waiting misread, documented. */
const TAIL_WINDOW = 1024 * 1024;
async function newestTranscriptTailLines(path: string): Promise<string[]> {
	try {
		const fh = await openFile(path, "r");
		try {
			const size = (await fh.stat()).size;
			const window = Math.min(size, TAIL_WINDOW);
			const offset = size - window;
			const buf = Buffer.alloc(window);
			await fh.read(buf, 0, window, offset);
			const lines = buf.toString("utf8").split("\n");
			if (offset > 0 && lines.length > 0) lines.shift(); // partial head record
			return lines.filter((l) => l.trim() !== "");
		} finally {
			await fh.close();
		}
	} catch {
		return [];
	}
}

export interface TranscriptState {
	ageMs: number | null;
	/** The transcript shows Claude owing the next turn (Brewing or a tool
	 * running) — working even while the title reads ✳ and the file is frozen. */
	working: boolean;
}

/** Memo of the owes-response verdict keyed by transcript path, valid while its
 * mtime is unchanged — an unchanged transcript can't change verdict, so the
 * 1MB read+parse is skipped across ticks (both key pollers hit this). */
const owesMemo = new Map<string, { mtimeMs: number; working: boolean }>();

/** Tests: clear the cross-tick memo. */
export function invalidateTranscriptMemo(): void {
	owesMemo.clear();
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
		if (newest === null) return { ageMs: null, working: false };
		const memo = owesMemo.get(newest.path);
		let working: boolean;
		if (memo !== undefined && memo.mtimeMs === newest.mtimeMs) {
			working = memo.working;
		} else {
			working = transcriptOwesResponse(await newestTranscriptTailLines(newest.path));
			owesMemo.set(newest.path, { mtimeMs: newest.mtimeMs, working });
		}
		return { ageMs: Math.max(0, now - newest.mtimeMs), working };
	} catch {
		return { ageMs: null, working: false };
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
