import { chmod, mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	cursorLsofArgs,
	cursorPsArgs,
	findTranscriptPath,
	invalidateCursorScan,
	invalidateCursorTranscriptPaths,
	scanCursorInstances,
	scanCursorSnapshot,
	type CursorExecFileLike,
} from "../src/mac/cursor-scan.js";

beforeEach(() => {
	invalidateCursorScan();
	invalidateCursorTranscriptPaths();
});

const VERSION_DIR = "/Users/j/.local/share/cursor-agent/versions/2026.08.11-e8db854";
const SESSION = "3d9825b5-d39c-45c3-9261-c9f33b9246c1";

/** Build a ~/.cursor/projects tree holding one session's transcript. */
async function transcriptTree(dirName: string, lines: string[]): Promise<string> {
	const base = await mkdtemp(join(tmpdir(), "sb-cursor-"));
	const dir = join(base, dirName, "agent-transcripts", SESSION);
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, `${SESSION}.jsonl`), lines.join("\n") + "\n");
	return base;
}

describe("Cursor transcript lookup", () => {
	/** Cursor truncates a long project path and appends a hash, so the folder
	 * name cannot be derived from the cwd — the session id has to drive it. */
	it("finds a transcript under a truncated, hash-suffixed project folder", async () => {
		const base = await transcriptTree("private-tmp-claude-501-Users-johnknox-code-switchbo-157e277", ["{}"]);
		const found = await findTranscriptPath(SESSION, base);
		expect(found.status).toBe("found");
		expect(found.status === "found" && found.path).toContain("switchbo-157e277");
	});

	/** "absent" is the only outcome allowed to read as idle, so a genuinely
	 * missing tree must say absent while a bad id must not say anything else. */
	it("reports absent — not failed — for an unknown session or a missing base", async () => {
		const base = await transcriptTree("Users-j-code-app", ["{}"]);
		expect((await findTranscriptPath("no-such-session", base)).status).toBe("absent");
		expect((await findTranscriptPath(SESSION, join(base, "absent"))).status).toBe("absent");
		expect((await findTranscriptPath("", base)).status).toBe("failed");
	});

	it("reports failed — never absent — when the projects folder cannot be read", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-locked-"));
		await mkdir(join(base, "Users-j-code-app"), { recursive: true });
		await chmod(base, 0o000);
		try {
			expect((await findTranscriptPath(SESSION, base)).status).toBe("failed");
		} finally {
			await chmod(base, 0o755);
		}
	});
});

describe("Cursor scan", () => {
	const chat = (home: string) => `${home}/.cursor/chats/b731b9d461b221a50ec0c5d38ce51d2c/${SESSION}`;

	function execFor(opts: { ps: string; lsof: string; pgrep?: string; onCall?: (f: string, a: readonly string[]) => void }) {
		return vi.fn((file: string, args: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
			opts.onCall?.(file, args);
			if (file === "/usr/bin/pgrep") cb(null, opts.pgrep ?? "37335\n37794\n", "");
			else if (file === "/bin/ps") cb(null, opts.ps, "");
			else cb(null, opts.lsof, "");
		});
	}

	it("maps a session to cwd + chat id + state, ignoring its worker child", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await transcriptTree("Users-j-code-app", [
			JSON.stringify({ role: "user", message: { content: [{ type: "text", text: "hi" }] } }),
			JSON.stringify({ type: "turn_ended", status: "success" }),
		]);
		expect((await findTranscriptPath(SESSION, base)).status).toBe("found");
		const calls: Array<{ file: string; args: readonly string[] }> = [];
		const exec = execFor({
			ps: [
				`37335  3591 ttys016  /Users/j/.local/bin/cursor-agent --use-system-ca ${VERSION_DIR}/index.js`,
				`37794 37335 ttys016  ${VERSION_DIR}/node ${VERSION_DIR}/index.js`,
			].join("\n"),
			lsof: `p37335\nfcwd\nn${cwd}\nftxt\nn${chat("/Users/j")}/store.db-shm\nftxt\nn${chat("/Users/j")}/store.db\n`,
			onCall: (file, args) => calls.push({ file, args }),
		});
		const [a, b] = await Promise.all([
			scanCursorInstances(exec as unknown as CursorExecFileLike, base),
			scanCursorInstances(exec as unknown as CursorExecFileLike, base),
		]);
		expect(a).toEqual(b); // one in-flight scan is shared
		expect(a).toHaveLength(1);
		expect(a[0]).toMatchObject({
			pid: 37335, tty: "/dev/ttys016", cwd: await realpath(cwd), sessionId: SESSION, state: "waiting",
		});
		// The worker child is filtered before lsof, so only the session is probed.
		expect(calls[1]).toEqual({ file: "/bin/ps", args: cursorPsArgs([37335, 37794]) });
		expect(calls[2]).toEqual({ file: "/usr/sbin/lsof", args: cursorLsofArgs([37335]) });
	});

	it("reports a session with no transcript yet as idle", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const exec = execFor({
			pgrep: "37335\n",
			ps: `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			lsof: `p37335\nfcwd\nn${cwd}\nftxt\nn${chat("/Users/j")}/store.db\n`,
		});
		const snap = await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base);
		expect(snap.status).toBe("ok");
		expect(snap.instances[0].state).toBe("waiting");
	});

	/** Present but not yet identifiable is its own answer, not a probe failure.
	 * Measured: a freshly opened cursor-agent holds ZERO handles under
	 * ~/.cursor/chats until it is first prompted, and treating that as a failure
	 * grayed out every Cursor key on the machine. */
	it("reports an unprompted session as present-but-unidentified, not as a failure", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const exec = execFor({
			pgrep: "37335\n",
			ps: `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			lsof: `p37335\nfcwd\nn${cwd}\n`, // a cwd, but no chat store open yet
		});
		const snap = await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base);
		expect(snap.status).toBe("ok"); // NOT a failed probe
		expect(snap.instances).toHaveLength(1);
		expect(snap.instances[0]).toMatchObject({ pid: 37335, sessionId: "", chatDir: "", state: "unknown" });
	});

	/** A session mid-switch briefly holds two chat stores; same treatment. It is
	 * really there, it just cannot be named — and an empty sessionId can never
	 * match a captured one, so nothing binds to the wrong conversation. */
	it("reports an ambiguous chat store the same way, without naming a conversation", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const other = chat("/Users/j").replace("3d9825b5", "4d9825b5");
		const exec = execFor({
			pgrep: "37335\n",
			ps: `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			lsof: `p37335\nfcwd\nn${cwd}\nftxt\nn${chat("/Users/j")}/store.db\nftxt\nn${other}/store.db\n`,
		});
		const snap = await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base);
		expect(snap.status).toBe("ok");
		expect(snap.instances[0].sessionId).toBe("");
	});

	/** No cwd is different: the process cannot be placed in a project at all. */
	it("is unknown when a live session cannot be placed in a project", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const exec = execFor({
			pgrep: "37335\n",
			ps: `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			lsof: "p37335\nftxt\nn/tmp/whatever\n",
		});
		expect(await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base))
			.toEqual({ status: "unknown", instances: [] });
	});

	it("returns a clean empty result when no cursor-agent is running", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const exec = vi.fn((_f: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => cb(Object.assign(new Error("no match"), { code: 1 }), "", ""));
		expect(await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base))
			.toEqual({ status: "ok", instances: [] });
		expect(exec).toHaveBeenCalledTimes(1); // stops at pgrep
	});

	/** Any other pgrep failure — a missing binary, a signal, a timeout — is NOT
	 * evidence that no session is running, and must not be reported as such. */
	it("never reports a broken pgrep as 'no sessions running'", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		for (const code of [2, 127, undefined]) {
			invalidateCursorScan();
			const exec = vi.fn((_f: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => cb(Object.assign(new Error("broken"), code === undefined ? {} : { code }), "", ""));
			expect(await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base))
				.toEqual({ status: "unknown", instances: [] });
		}
	});

	/** An unreadable transcript is an absence of evidence, not proof of idleness. */
	it("reports an unreadable transcript as unknown, not idle", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await mkdtemp(join(tmpdir(), "sb-cursor-"));
		const dir = join(base, "Users-j-code-app", "agent-transcripts", SESSION);
		await mkdir(dir, { recursive: true });
		// A single record far larger than the tail window: the window lands
		// inside it, so no whole line can be recovered.
		await writeFile(join(dir, `${SESSION}.jsonl`), `{"padding":"${"x".repeat(400 * 1024)}"}`);
		const exec = execFor({
			pgrep: "37335\n",
			ps: `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			lsof: `p37335\nfcwd\nn${cwd}\nftxt\nn${chat("/Users/j")}/store.db\n`,
		});
		const snap = await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base);
		expect(snap.instances[0].state).toBe("unknown");
	});

	it("stops before lsof when nothing survives the identity filter", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const exec = execFor({
			ps: [
				`900 1 ??       ${VERSION_DIR}/node ${VERSION_DIR}/index.js`,
				"901 1 ttys003  vim /Users/j/notes/cursor-agent.md",
			].join("\n"),
			lsof: "",
		});
		expect(await scanCursorInstances(exec as unknown as CursorExecFileLike, base)).toEqual([]);
		expect(exec).toHaveBeenCalledTimes(2);
	});

	it("surfaces a failed process probe as unknown rather than clean absence", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const exec = vi.fn((file: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
			if (file === "/usr/bin/pgrep") cb(null, "37335\n", "");
			else cb(new Error("ps failed"), "", "boom");
		});
		expect(await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base))
			.toEqual({ status: "unknown", instances: [] });
	});

	it("downgrades remembered sessions to unknown when a later probe fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const ok = execFor({
			pgrep: "37335\n",
			ps: `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			lsof: `p37335\nfcwd\nn${cwd}\nftxt\nn${chat("/Users/j")}/store.db\n`,
		});
		expect((await scanCursorSnapshot(ok as unknown as CursorExecFileLike, base)).instances).toHaveLength(1);
		// NOTE: capture the real clock BEFORE installing the spy — `vi.spyOn` replaces
		// Date.now immediately, so evaluating `Date.now()` inside mockReturnValue's
		// argument reads the not-yet-configured mock and yields NaN.
		const realNow = Date.now();
		vi.spyOn(Date, "now").mockReturnValue(realNow + 10_000); // the 2s TTL lapses
		const broken = vi.fn((file: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
			if (file === "/usr/bin/pgrep") cb(null, "37335\n", "");
			else cb(new Error("ps failed"), "", "boom");
		});
		const snap = await scanCursorSnapshot(broken as unknown as CursorExecFileLike, base);
		expect(snap.status).toBe("unknown");
		expect(snap.instances[0].state).toBe("unknown");
		vi.restoreAllMocks();
	});

	/** A record still being appended must not let the reader fall back to the
	 * PREVIOUS record — which would be the last turn's terminator, i.e. "idle"
	 * reported exactly as a new turn starts. */
	it("ignores a half-written final record instead of reading the turn before it", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await mkdtemp(join(tmpdir(), "sb-cursor-"));
		const dir = join(base, "Users-j-code-app", "agent-transcripts", SESSION);
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, `${SESSION}.jsonl`),
			JSON.stringify({ type: "turn_ended", status: "success" }) + "\n" + '{"role":"user","mess');
		const exec = execFor({
			pgrep: "37335\n",
			ps: `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`,
			lsof: `p37335\nfcwd\nn${cwd}\nftxt\nn${chat("/Users/j")}/store.db\n`,
		});
		const snap = await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base);
		expect(snap.instances[0].state).toBe("waiting");
	});

	/** A pgrep killed by the timeout may still surface a numeric code; that is a
	 * failed probe, not pgrep's "nothing matched" exit status. */
	it("treats a killed pgrep as a failed probe even when it carries code 1", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		const exec = vi.fn((_f: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) =>
			cb(Object.assign(new Error("timed out"), { code: 1, killed: true, signal: "SIGTERM" }), "", ""));
		expect(await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base))
			.toEqual({ status: "unknown", instances: [] });
	});

	/** The generation guard exists so a scan begun BEFORE a press cannot land
	 * after the press's fresh scan and leave the cache holding older data. */
	it("does not let a superseded scan overwrite a newer one's cached result", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "sb-proj-"));
		const base = await mkdtemp(join(tmpdir(), "sb-empty-"));
		let releaseStale: (() => void) | null = null;
		const stalePs = new Promise<void>((r) => { releaseStale = r; });
		let firstPs = true;
		const exec = vi.fn((file: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
			if (file === "/usr/bin/pgrep") return cb(null, "37335\n", "");
			if (file === "/bin/ps") {
				const out = `37335 3591 ttys016  /Users/j/.local/bin/agent --use-system-ca ${VERSION_DIR}/index.js`;
				if (firstPs) { firstPs = false; void stalePs.then(() => cb(null, out, "")); return; }
				return cb(null, out, "");
			}
			return cb(null, `p37335\nfcwd\nn${cwd}\nftxt\nn${chat("/Users/j")}/store.db\n`, "");
		});
		const stale = scanCursorSnapshot(exec as unknown as CursorExecFileLike, base);
		invalidateCursorScan();                       // a press arrives
		await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base); // fresh scan lands first
		releaseStale!();                              // now the old scan finishes
		await stale;
		// The cache must still be the fresh generation's, not the stale one's.
		const cached = await scanCursorSnapshot(exec as unknown as CursorExecFileLike, base);
		expect(cached.status).toBe("ok");
		expect(cached.instances).toHaveLength(1);
	});
});