import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	codexLsofArgs,
	codexPsArgs,
	invalidateCodexScan,
	scanCodexInstances,
	scanCodexSnapshot,
	type CodexExecFileLike,
} from "../src/mac/codex-scan.js";

beforeEach(() => invalidateCodexScan());

describe("Codex scan", () => {
	it("maps interactive PID -> cwd -> open rollout and shares an in-flight scan", async () => {
		const base = await mkdtemp(join(tmpdir(), "sb-codex-"));
		const sessions = join(base, "sessions", "2026", "08", "14");
		await import("node:fs/promises").then(({ mkdir }) => mkdir(sessions, { recursive: true }));
		const rollout = join(sessions, "rollout-x-019ffe6c-ccf2-7fd1-b921-97dcd78fba71.jsonl");
		await writeFile(rollout, [
			JSON.stringify({ type: "session_meta", payload: { originator: "codex-tui" } }),
			JSON.stringify({ type: "event_msg", payload: { type: "task_started" } }),
		].join("\n") + "\n");
		const calls: Array<{ file: string; args: readonly string[] }> = [];
		const exec = vi.fn((file: string, args: readonly string[], _options: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
			calls.push({ file, args });
			if (file === "/usr/bin/pgrep") cb(null, "42\n", "");
			else if (file === "/bin/ps") cb(null, "42 ttys007 codex codex\n", "");
			else cb(null, `p42\nfcwd\nn${base}\nf9\nn${rollout}\n`, "");
		});
		const [a, b] = await Promise.all([
			scanCodexInstances(exec as unknown as CodexExecFileLike),
			scanCodexInstances(exec as unknown as CodexExecFileLike),
		]);
		expect(a).toEqual(b);
		expect(a[0]).toMatchObject({ pid: 42, tty: "/dev/ttys007", cwd: await realpath(base), state: "working", sessionId: "019ffe6c-ccf2-7fd1-b921-97dcd78fba71" });
		expect(calls).toHaveLength(3);
		expect(calls[1]).toEqual({ file: "/bin/ps", args: codexPsArgs([42]) });
		expect(calls[2]).toEqual({ file: "/usr/sbin/lsof", args: codexLsofArgs([42]) });
	});

	it("returns empty for ttyless/non-Codex candidates before lsof", async () => {
		const exec = vi.fn((file: string, _args: readonly string[], _options: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
			if (file === "/usr/bin/pgrep") cb(null, "42\n43\n", "");
			else cb(null, "42 ttys007 node node task\n43 ?? codex codex app-server\n", "");
		});
		expect(await scanCodexInstances(exec as unknown as CodexExecFileLike)).toEqual([]);
		expect(exec).toHaveBeenCalledTimes(2);
	});

	it("surfaces process-tool failure as unknown rather than clean absence", async () => {
		const exec = vi.fn((_file: string, _args: readonly string[], _options: unknown, cb: (e: Error | null, out: string, err: string) => void) => cb(new Error("nope"), "", "nope"));
		expect(await scanCodexSnapshot(exec as unknown as CodexExecFileLike)).toEqual({ status: "unknown", instances: [] });
	});

	describe("fresh scans (press path)", () => {
		const empty = (props: Record<string, unknown> = { code: 1 }) =>
			vi.fn((_f: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) =>
				cb(Object.assign(new Error("nothing"), props), "", ""));

		it("bypasses a warm world cache", async () => {
			const exec = empty();
			await scanCodexSnapshot(exec as unknown as CodexExecFileLike); // warms the world cache
			const before = exec.mock.calls.length;
			await scanCodexSnapshot(exec as unknown as CodexExecFileLike, { fresh: true });
			expect(exec.mock.calls.length).toBeGreaterThan(before);
		});

		it("does not join an in-flight scan", async () => {
			let release: (() => void) | null = null;
			const gate = new Promise<void>((r) => { release = r; });
			let pgrepCalls = 0;
			const exec = vi.fn((file: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
				if (file !== "/usr/bin/pgrep") return;
				pgrepCalls++;
				if (pgrepCalls === 1) { void gate.then(() => cb(Object.assign(new Error("x"), { code: 1 }), "", "")); return; }
				cb(Object.assign(new Error("x"), { code: 1 }), "", "");
			});
			const first = scanCodexSnapshot(exec as unknown as CodexExecFileLike); // in-flight, held open
			const second = scanCodexSnapshot(exec as unknown as CodexExecFileLike, { fresh: true }); // must NOT join it
			release!();
			await Promise.all([first, second]);
			expect(pgrepCalls).toBe(2);
		});

		/** A2/A7 mirrored from claude-scan: driven by controlling COMPLETION
		 * order, not merely asserting both scans happened. codex-scan treats
		 * ANY pgrep failure as "unknown" (unlike claude/cursor, it draws no
		 * "exit 1 = nothing matched" distinction), so a failed pgrep vs. a
		 * successful-but-empty one gives two cleanly distinguishable results
		 * to prove which one actually got cached. */
		it("a scan that started earlier cannot publish over one that started later", async () => {
			let release: (() => void) | null = null;
			const gate = new Promise<void>((r) => { release = r; });
			let pgrepCalls = 0;
			const exec = vi.fn((file: string, _a: readonly string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
				if (file !== "/usr/bin/pgrep") return;
				pgrepCalls++;
				if (pgrepCalls === 1) { void gate.then(() => cb(new Error("broken"), "", "")); return; } // earlier: probe failure -> unknown
				cb(null, "", ""); // later: probe succeeded, no codex pids -> a clean "ok"
			});
			const earlier = scanCodexSnapshot(exec as unknown as CodexExecFileLike, { fresh: true }); // mySeq 1, stalls
			const later = scanCodexSnapshot(exec as unknown as CodexExecFileLike, { fresh: true }); // mySeq 2, races ahead
			const laterResult = await later;
			expect(laterResult).toEqual({ status: "ok", instances: [] });
			release!();
			const earlierResult = await earlier; // its own honest answer to its caller
			expect(earlierResult.status).toBe("unknown");
			// ...but must NOT have become the shared cache, even finishing last.
			const cached = await scanCodexSnapshot(exec as unknown as CodexExecFileLike);
			expect(cached).toEqual({ status: "ok", instances: [] });
		});
	});
});
