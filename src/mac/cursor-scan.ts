/**
 * WHAT IT'S FOR: the one place that asks the machine "which interactive
 * Cursor CLI sessions exist right now, in which folders, and what is each
 * doing?" — so every visible Cursor Project key repaints from a single
 * bounded snapshot instead of each key shelling out for itself.
 *
 * Shape of a scan: `pgrep` narrows to candidate pids, one targeted `ps`
 * reads their argv and parent, one batched `lsof` maps each to its working
 * directory and chat store, and the newest transcript tail supplies the
 * working/idle verdict. Every external command runs with an absolute path
 * (Stream Deck gives plugins a minimal PATH) and `UTF8_ENV` (its environment
 * has no LANG, and the C locale mangles non-ASCII output).
 *
 * The snapshot carries a `status`. When any probe fails the scan reports
 * `unknown` and downgrades remembered sessions rather than serving a
 * confident, stale answer — a key that focuses the wrong terminal window is
 * worse than a key that admits it doesn't know.
 *
 * Privacy: transcripts contain the operator's prompts and command text. Only
 * a bounded tail is read, only `type`/`role` are parsed out of it, and no
 * transcript content is ever returned or logged.
 */

import { execFile as nodeExecFile } from "node:child_process";
import { open, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
	type CursorInstance,
	type CursorState,
	cursorSessionId,
	cursorStateFromTranscriptLines,
	isCursorProcess,
	parseCursorProcesses,
	parseLsofEntries,
	soleChatDir,
	withoutWorkerChildren,
} from "./cursor-project.js";
import { UTF8_ENV } from "./tmux-runner.js";

export type CursorExecFileLike = (
	file: string,
	args: readonly string[],
	options: { timeout?: number; env?: NodeJS.ProcessEnv },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

const TIMEOUT_MS = 4000;
const WORLD_TTL_MS = 2000;
/** Enough to hold the last turn's records; bounds how much prompt text is
 * ever paged in. A record larger than the window yields unparsable fragments,
 * which the state parser treats as no evidence rather than as a verdict. */
const TAIL_BYTES = 256 * 1024;
const PROJECT_BATCH = 32;

export interface CursorScanSnapshot {
	status: "ok" | "unknown";
	instances: CursorInstance[];
}

let cache: { at: number; snapshot: CursorScanSnapshot } | null = null;
let inFlight: Promise<CursorScanSnapshot> | null = null;
/** Bumped by every invalidation. A scan carries the generation it started in
 * and declines to publish its result if that generation has since moved on —
 * without it, a slow scan begun before a press could land AFTER the press's
 * fresh scan and leave the cache holding older data. */
let generation = 0;
/** Session id → transcript path. A session's transcript never moves, so this
 * spares the per-tick directory walk once a session has been seen. */
const transcriptPaths = new Map<string, string>();

function run(file: string, args: readonly string[], exec: CursorExecFileLike): Promise<{ ok: boolean; stdout: string; exitCode: number | null }> {
	return new Promise((resolve) => {
		exec(file, args, { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error, stdout) => {
			const e = error as { code?: unknown; killed?: unknown; signal?: unknown } | null;
			// A process cut short by the timeout is NOT reporting an exit status,
			// even though Node may still surface a numeric `code`.
			const terminated = e !== null && (e.killed === true || typeof e.signal === "string");
			const code = terminated ? null : e?.code;
			resolve({ ok: error === null, stdout: String(stdout ?? ""), exitCode: typeof code === "number" ? code : null });
		});
	});
}

/** pgrep's documented contract: exit 1 means "nothing matched" — a definite,
 * trustworthy answer. Any other non-zero exit (or a signal/timeout, which
 * surfaces as a non-numeric code) means the probe itself failed, and must NOT
 * be reported as "no Cursor sessions are running". */
function pgrepFoundNothing(result: { ok: boolean; stdout: string; exitCode: number | null }): boolean {
	return !result.ok && result.exitCode === 1 && result.stdout.trim() === "";
}

/** Candidate discovery. Matches the installed-version path that every
 * cursor-agent process carries, whichever symlink name was typed; the strict
 * argv/tty/parent filtering happens in the pure layer. */
export const PGREP_CURSOR_ARGS = ["-f", "cursor-agent/versions"];

export function cursorPsArgs(pids: number[]): string[] {
	return ["-o", "pid=,ppid=,tty=,args=", "-p", pids.join(",")];
}

export function cursorLsofArgs(pids: number[]): string[] {
	return ["-nP", "-a", "-p", pids.join(","), "-Fpcfn"];
}

/**
 * Locate a session's transcript by session id.
 *
 * Cursor files transcripts under a per-project directory whose name is
 * derived from the working directory — but that derivation is lossy: a long
 * path is truncated and given a hash suffix (observed:
 * `private-tmp-…-switchbo-157e277`). Reconstructing the name is therefore not
 * possible in general, so the id — which IS exact — drives the lookup and the
 * project directories are enumerated. Bounded and memoised.
 */
export type TranscriptLookup =
	/** Found it. */
	| { status: "found"; path: string }
	/** Searched successfully; this session has no transcript yet (it has not
	 * been prompted). This is the ONLY outcome that may be read as "idle". */
	| { status: "absent" }
	/** The search itself failed — an unreadable directory, an I/O error. Says
	 * nothing about the session, and must never become a confident face. */
	| { status: "failed" };

function isMissing(error: unknown): boolean {
	const code = (error as { code?: unknown } | null)?.code;
	return code === "ENOENT" || code === "ENOTDIR";
}

export async function findTranscriptPath(
	sessionId: string,
	base: string,
): Promise<TranscriptLookup> {
	if (sessionId === "") return { status: "failed" };
	const key = `${base}\u0000${sessionId}`;
	const memo = transcriptPaths.get(key);
	if (memo !== undefined) return { status: "found", path: memo };
	let names: string[];
	try {
		names = await readdir(base);
	} catch (error) {
		// No projects folder at all = Cursor has never run here, which is a real
		// "absent". Anything else (EACCES, EIO) is a failed probe.
		return isMissing(error) ? { status: "absent" } : { status: "failed" };
	}
	let probeFailed = false;
	for (let i = 0; i < names.length; i += PROJECT_BATCH) {
		const found = await Promise.all(
			names.slice(i, i + PROJECT_BATCH).map(async (name) => {
				const path = join(base, name, "agent-transcripts", sessionId, `${sessionId}.jsonl`);
				try {
					return (await stat(path)).isFile() ? path : null;
				} catch (error) {
					if (!isMissing(error)) probeFailed = true;
					return null;
				}
			}),
		);
		for (const path of found) {
			if (path !== null) {
				transcriptPaths.set(key, path);
				return { status: "found", path };
			}
		}
	}
	// Not found, but at least one directory could not be checked — so "not
	// found" is not something we actually established.
	return probeFailed ? { status: "failed" } : { status: "absent" };
}

/**
 * Read the transcript's trailing window as COMPLETE lines, or null when the
 * file cannot be turned into usable evidence.
 *
 * The null case matters: an empty array means "this session has written
 * nothing yet", which the state parser reads as idle. A failed open/read, or a
 * window that lands entirely inside one oversized final record, must NOT be
 * allowed to masquerade as that — it is an absence of evidence, and painting a
 * confident "idle" from it would be exactly the lie this module avoids
 * elsewhere. When the head is clipped the first fragment is dropped rather
 * than handed to the parser as though it were a whole record.
 */
async function transcriptTailLines(path: string): Promise<string[] | null> {
	try {
		const fh = await open(path, "r");
		try {
			const size = (await fh.stat()).size;
			if (size === 0) return [];
			const window = Math.min(size, TAIL_BYTES);
			const offset = size - window;
			const buf = Buffer.alloc(window);
			await fh.read(buf, 0, window, offset);
			const text = buf.toString("utf8");
			const lines = text.split("\n");
			if (offset > 0) lines.shift();
			// A file not ending in a newline is mid-append: its final fragment is
			// a partial record. Left in, it fails to parse and the reader falls
			// back to the PREVIOUS record — which can be the last turn's
			// terminator, reporting "idle" just as a new turn begins.
			if (!text.endsWith("\n")) lines.pop();
			const usable = lines.filter((line) => line.trim() !== "");
			// A non-empty file that yielded no whole line: one record is larger
			// than the window, so the tail says nothing we can rely on.
			return usable.length === 0 ? null : usable;
		} finally {
			await fh.close();
		}
	} catch {
		return null;
	}
}

export function invalidateCursorScan(): void {
	cache = null;
	inFlight = null;
	generation++;
}

/** Tests: also drop the session→transcript memo. */
export function invalidateCursorTranscriptPaths(): void {
	transcriptPaths.clear();
}

/** Where Cursor files its per-project transcripts. A parameter so tests can
 * point at a fixture tree instead of the operator's real, populated one. */
export const CURSOR_PROJECTS_BASE = join(homedir(), ".cursor", "projects");

export function scanCursorInstances(
	exec: CursorExecFileLike = nodeExecFile as unknown as CursorExecFileLike,
	projectsBase: string = CURSOR_PROJECTS_BASE,
): Promise<CursorInstance[]> {
	return scanCursorSnapshot(exec, projectsBase).then((snapshot) => snapshot.instances);
}

export function scanCursorSnapshot(
	exec: CursorExecFileLike = nodeExecFile as unknown as CursorExecFileLike,
	projectsBase: string = CURSOR_PROJECTS_BASE,
): Promise<CursorScanSnapshot> {
	if (cache !== null && Date.now() - cache.at < WORLD_TTL_MS) return Promise.resolve(cache.snapshot);
	if (inFlight !== null) return inFlight;
	const p = doScan(exec, projectsBase, generation);
	inFlight = p;
	void p.finally(() => { if (inFlight === p) inFlight = null; });
	return p;
}

async function doScan(exec: CursorExecFileLike, projectsBase: string, gen: number): Promise<CursorScanSnapshot> {
	const now = Date.now();
	const pgrep = await run("/usr/bin/pgrep", PGREP_CURSOR_ARGS, exec);
	if (pgrepFoundNothing(pgrep)) return remember(now, gen, { status: "ok", instances: [] });
	if (!pgrep.ok) return rememberUnknown(now, gen);
	const pids = pgrep.stdout.split("\n").map((s) => Number.parseInt(s.trim(), 10)).filter(Number.isFinite);
	if (pids.length === 0) return remember(now, gen, { status: "ok", instances: [] });
	const ps = await run("/bin/ps", cursorPsArgs(pids), exec);
	if (!ps.ok) return rememberUnknown(now, gen);
	const processes = withoutWorkerChildren(parseCursorProcesses(ps.stdout).filter(isCursorProcess));
	if (processes.length === 0) return remember(now, gen, { status: "ok", instances: [] });
	const lsof = await run("/usr/sbin/lsof", cursorLsofArgs(processes.map((p) => p.pid)), exec);
	if (!lsof.ok) return rememberUnknown(now, gen);
	const entries = parseLsofEntries(lsof.stdout);
	let incomplete = false;
	const instances = await Promise.all(processes.map(async (process) => {
		const mine = entries.filter((e) => e.pid === process.pid);
		const cwdRaw = mine.find((e) => e.fd === "cwd")?.name ?? "";
		const chatDir = soleChatDir(mine.map((e) => e.name));
		// A session still opening its store, or one mid-switch between two
		// chats, cannot be identified — say so instead of picking one.
		if (cwdRaw === "" || chatDir === "") { incomplete = true; return null; }
		let cwd = cwdRaw;
		try { cwd = await realpath(cwdRaw); } catch { /* process may exit mid-scan */ }
		const sessionId = cursorSessionId(chatDir);
		const transcript = await findTranscriptPath(sessionId, projectsBase);
		// Only a SUCCESSFUL search that found nothing means "not prompted yet",
		// which is genuinely idle. A failed search is an absence of evidence.
		let state: Exclude<CursorState, "none">;
		if (transcript.status === "absent") {
			state = "waiting";
		} else if (transcript.status === "failed") {
			state = "unknown";
		} else {
			const lines = await transcriptTailLines(transcript.path);
			state = lines === null ? "unknown" : cursorStateFromTranscriptLines(lines);
		}
		const instance: CursorInstance = {
			pid: process.pid,
			tty: process.tty.startsWith("/dev/") ? process.tty : `/dev/${process.tty}`,
			cwd,
			chatDir,
			sessionId,
			state,
		};
		return instance;
	}));
	return remember(now, gen, {
		status: incomplete ? "unknown" : "ok",
		instances: instances.filter((i): i is CursorInstance => i !== null),
	});
}

function remember(at: number, gen: number, snapshot: CursorScanSnapshot): CursorScanSnapshot {
	// Still return the snapshot to whoever awaited THIS scan; just don't let a
	// superseded scan become the cached view of the world.
	if (gen !== generation) return snapshot;
	cache = { at, snapshot };
	// Sessions come and go; keep the memo from growing without bound.
	if (transcriptPaths.size > 64) {
		const live = new Set(snapshot.instances.map((i) => i.sessionId));
		for (const memoKey of [...transcriptPaths.keys()]) {
			const id = memoKey.slice(memoKey.indexOf("\u0000") + 1);
			if (!live.has(id)) transcriptPaths.delete(memoKey);
		}
	}
	return snapshot;
}

function rememberUnknown(at: number, gen: number): CursorScanSnapshot {
	const stale = cache?.snapshot.instances.map((instance) => ({ ...instance, state: "unknown" as const })) ?? [];
	return remember(at, gen, { status: "unknown", instances: stale });
}
