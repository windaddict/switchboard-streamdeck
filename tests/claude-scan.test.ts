import { describe, expect, it, vi } from "vitest";
import { beforeEach } from "vitest";
import {
	childPidsArgs,
	claudeDetailArgs,
	confirmShellArgs,
	type ExecFileLike,
	invalidateClaudeScan,
	invalidateWorldCache,
	lsofCwdArgs,
	PGREP_CLAUDE_ARGS,
	processRunning,
	scanClaudeInstances,
	scanClaudeSnapshot,
} from "../src/mac/claude-scan.js";

beforeEach(() => invalidateClaudeScan());

describe("scanClaudeInstances", () => {
	/** The child-probe chain (pgrep -P -> confirming ps) and the lsof cwd probe
	 * both depend only on the FIRST ps and now run concurrently, so their
	 * relative order is no longer meaningful — this pins the call SET instead
	 * of a strict order. The two ps calls are told apart by shape rather than
	 * position for the same reason. */
	it("issues pgrep -> targeted ps -> {pgrep -P -> confirm ps} || batched lsof", async () => {
		const calls: Array<{ file: string; args: readonly string[] }> = [];
		const exec = vi.fn((file, args, _o, cb) => {
			calls.push({ file, args });
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1120\n14251\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "3161\n", "");
			else if (file === "/bin/ps" && args[0] === "-o" && args[1].startsWith("pid=,ppid=,tty="))
				cb(null, "1120 1 ttys019 claude\n14251 1 ttys001 claude\n", "");
			else if (file === "/bin/ps")
				cb(null, "3161 1120 /bin/zsh -c source /u/.claude/shell-snapshots/snapshot-z.sh\n", "");
			else cb(null, "p1120\nfcwd\nn/Users/j/code/a\np14251\nfcwd\nn/Users/j/code/b\n", "");
		});
		const got = await scanClaudeInstances(exec as unknown as ExecFileLike);
		expect(got).toEqual([
			{ pid: 1120, tty: "/dev/ttys019", cwd: "/Users/j/code/a", shellBusy: true },
			{ pid: 14251, tty: "/dev/ttys001", cwd: "/Users/j/code/b", shellBusy: false },
		]);
		expect(calls).toHaveLength(5);
		expect(calls[0]).toEqual({ file: "/usr/bin/pgrep", args: PGREP_CLAUDE_ARGS });
		expect(calls[1]).toEqual({ file: "/bin/ps", args: claudeDetailArgs([1120, 14251]) });
		// The remaining three (child pgrep, confirm ps, lsof) may interleave in
		// either order — assert the SET, not a position.
		const rest = calls.slice(2);
		expect(rest).toContainEqual({ file: "/usr/bin/pgrep", args: childPidsArgs([1120, 14251]) });
		expect(rest).toContainEqual({ file: "/bin/ps", args: confirmShellArgs([3161]) });
		expect(rest.some((c) => c.file === "/usr/sbin/lsof")).toBe(true);
	});

	it("cwds come from cache on the second scan (no second lsof)", async () => {
		const exec = vi.fn((file, args, _o, cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && args[0] === "-o" && args[1].startsWith("pid=,ppid=,tty="))
				cb(null, "1 9 ttys001 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else cb(null, "p1\nfcwd\nn/Users/j/x\n", "");
		});
		await scanClaudeInstances(exec as unknown as ExecFileLike);
		invalidateWorldCache();
		await scanClaudeInstances(exec as unknown as ExecFileLike);
		const lsofCalls = exec.mock.calls.filter((c) => c[0] === "/usr/sbin/lsof");
		expect(lsofCalls).toHaveLength(1); // second scan hit the cwd cache
	});
	it("no claude processes -> pgrep only, empty result", async () => {
		const exec = vi.fn((_f, _a, _o, cb) => cb(new Error("exit 1"), "", ""));
		expect(await scanClaudeInstances(exec as unknown as ExecFileLike)).toEqual([]);
		expect(exec).toHaveBeenCalledTimes(1);
	});
	it("drops instances whose cwd could not be resolved", async () => {
		const exec = vi.fn((file, a, _o, cb) => {
			if (file === "/usr/bin/pgrep" && a[0] === "-x") cb(null, "1\n2\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && a[0] === "-o" && a[1].startsWith("pid=,ppid=,tty="))
				cb(null, "1 9 ttys001 claude\n2 9 ttys002 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else cb(null, "p1\nfcwd\nn/Users/j/x\n", "");
		});
		const got = await scanClaudeInstances(exec as unknown as ExecFileLike);
		expect(got).toEqual([{ pid: 1, tty: "/dev/ttys001", cwd: "/Users/j/x", shellBusy: false }]);
	});
	it("a failed pgrep yields an empty scan (never throws into the poll)", async () => {
		const exec = vi.fn((_f, _a, _o, cb) => cb(new Error("nope"), "", ""));
		expect(await scanClaudeInstances(exec as unknown as ExecFileLike)).toEqual([]);
	});
});

describe("processRunning", () => {
	it("true when pgrep exits 0, false otherwise", async () => {
		const yes = vi.fn((_f, _a, _o, cb) => cb(null, "123\n", ""));
		const no = vi.fn((_f, _a, _o, cb) => cb(new Error("exit 1"), "", ""));
		expect(await processRunning("iTerm2", yes as unknown as ExecFileLike)).toBe(true);
		expect(await processRunning("Terminal", no as unknown as ExecFileLike)).toBe(false);
	});
});

describe("scanClaudeSnapshot", () => {

	/** A fresh scan must resolve identity from its OWN lsof. Before this, the
	 * memo entry survived when lsof succeeded but omitted a pid, so a "fresh"
	 * scan could hand a press a cwd observed up to 60s earlier. */
	it("fresh: an lsof that omits a pid yields no cwd, never a 60s-old one", async () => {
		const good = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else cb(null, "p1\nn/Users/j/warm\n", "");
		});
		expect((await scanClaudeSnapshot(good as unknown as ExecFileLike)).instances[0].cwd).toBe("/Users/j/warm");
		// Same pid, but this lsof answers about nobody.
		const omits = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else cb(null, "", ""); // succeeds, reports nothing
		});
		const snap = await scanClaudeSnapshot(omits as unknown as ExecFileLike, { fresh: true });
		expect(snap.instances.map((i) => i.cwd)).not.toContain("/Users/j/warm");
		expect(snap.status).toBe("unknown"); // a live session it could not place
	});

	/** Invalidation must not hand an already-running scan the right to publish
	 * over a newer one: it raises the watermark rather than zeroing the counter. */
	it("invalidation locks out an in-flight scan instead of promoting it", async () => {
		let releaseOld: (() => void) | null = null;
		const held = new Promise<void>((r) => { releaseOld = r; });
		let first = true;
		const exec = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else if (first) { first = false; void held.then(() => cb(null, "p1\nn/Users/j/STALE\n", "")); }
			else cb(null, "p1\nn/Users/j/FRESH\n", "");
		});
		const stale = scanClaudeSnapshot(exec as unknown as ExecFileLike); // starts, then hangs
		invalidateClaudeScan();
		const fresh = await scanClaudeSnapshot(exec as unknown as ExecFileLike);
		expect(fresh.instances[0].cwd).toBe("/Users/j/FRESH");
		releaseOld!();
		await stale;
		// The cached view must still be the newer scan's.
		expect((await scanClaudeSnapshot(exec as unknown as ExecFileLike)).instances[0].cwd).toBe("/Users/j/FRESH");
	});
	type Cb = (error: Error | null, stdout: string, stderr: string) => void;
	/** An execFile error carrying whatever Node would attach for this failure. */
	const failure = (props: Record<string, unknown>) => Object.assign(new Error("probe failed"), props);
	const isDetailPs = (args: readonly string[]) => args[0] === "-o" && String(args[1]).startsWith("pid=,ppid=,tty=");

	/** One claude in /Users/j/x, no busy shell — the baseline good world. */
	function healthyExec() {
		return vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else cb(null, "p1\nfcwd\nn/Users/j/x\n", "");
		});
	}
	const ONE = [{ pid: 1, tty: "/dev/ttys001", cwd: "/Users/j/x", shellBusy: false }];

	it("reports a healthy scan as ok", async () => {
		expect(await scanClaudeSnapshot(healthyExec() as unknown as ExecFileLike))
			.toEqual({ status: "ok", instances: ONE });
	});

	/** pgrep signals "nothing matched" with exit status 1 — a definite answer. */
	it("treats pgrep's exit 1 as a trustworthy 'nothing running'", async () => {
		const exec = vi.fn((_f: string, _a: readonly string[], _o: unknown, cb: Cb) => cb(failure({ code: 1 }), "", ""));
		expect(await scanClaudeSnapshot(exec as unknown as ExecFileLike))
			.toEqual({ status: "ok", instances: [] });
		expect(exec).toHaveBeenCalledTimes(1); // stops at pgrep
	});

	/** Any other pgrep failure — a missing binary, a signal, a timeout — says
	 * nothing about how many sessions are running. A killed process may still
	 * carry a numeric code, so `killed`/`signal` have to be consulted too. */
	it("never reports a broken pgrep as 'no sessions running'", async () => {
		for (const props of [{ code: 2 }, { code: 127 }, {}, { code: 1, killed: true, signal: "SIGTERM" }]) {
			invalidateClaudeScan();
			const exec = vi.fn((_f: string, _a: readonly string[], _o: unknown, cb: Cb) => cb(failure(props), "", ""));
			expect(await scanClaudeSnapshot(exec as unknown as ExecFileLike))
				.toEqual({ status: "unknown", instances: [] });
		}
	});

	it("surfaces a failed ps as unknown rather than clean absence", async () => {
		const exec = vi.fn((file: string, _a: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep") cb(null, "1\n", "");
			else cb(failure({ code: 1 }), "", "");
		});
		expect(await scanClaudeSnapshot(exec as unknown as ExecFileLike))
			.toEqual({ status: "unknown", instances: [] });
	});

	it("surfaces a failed lsof as unknown — without cwds there is no project", async () => {
		const exec = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else cb(failure({ code: 1 }), "", "");
		});
		expect(await scanClaudeSnapshot(exec as unknown as ExecFileLike))
			.toEqual({ status: "unknown", instances: [] });
	});

	it("downgrades a remembered scan to unknown instead of silently emptying it", async () => {
		const first = await scanClaudeSnapshot(healthyExec() as unknown as ExecFileLike);
		expect(first).toEqual({ status: "ok", instances: ONE });
		// Let the 2s world TTL lapse the way it does in life: `invalidateWorldCache`
		// would DROP the remembered snapshot, which is the thing under test here.
		// NOTE: capture the real clock BEFORE installing the spy — `vi.spyOn` replaces
		// Date.now immediately, so evaluating `Date.now()` inside mockReturnValue's
		// argument reads the not-yet-configured mock and yields NaN.
		const realNow = Date.now();
		vi.spyOn(Date, "now").mockReturnValue(realNow + 10_000); // the 2s TTL lapses
		const broken = vi.fn((file: string, _a: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep") cb(null, "1\n", "");
			else cb(failure({ code: 1 }), "", "");
		});
		const snap = await scanClaudeSnapshot(broken as unknown as ExecFileLike);
		expect(snap.status).toBe("unknown");
		expect(snap.instances).toEqual(ONE); // remembered, not invented and not dropped
		vi.restoreAllMocks();
	});

	/** A live claude whose cwd lsof never reported cannot be bound to a project,
	 * so the list is not the whole truth even though every command exited 0. */
	it("is unknown when a live session could not be resolved to a project", async () => {
		const exec = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n2\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n2 9 ttys002 claude\n", "");
			else if (file === "/bin/ps") cb(null, "", "");
			else cb(null, "p1\nfcwd\nn/Users/j/x\n", "");
		});
		expect(await scanClaudeSnapshot(exec as unknown as ExecFileLike))
			.toEqual({ status: "unknown", instances: ONE });
	});

	/** DELIBERATE tolerance: the shell-busy child probe only upgrades a session
	 * to "working", so its failure must not throw away everyone's project
	 * identity — see the comment at that call in claude-scan.ts. */
	it("stays ok when the shell-busy child pgrep fails (no busy upgrade)", async () => {
		const exec = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(failure({ code: 2 }), "", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n", "");
			else cb(null, "p1\nfcwd\nn/Users/j/x\n", "");
		});
		expect(await scanClaudeSnapshot(exec as unknown as ExecFileLike))
			.toEqual({ status: "ok", instances: ONE });
	});

	it("stays ok when the confirming ps for shell children fails", async () => {
		const exec = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
			if (file === "/usr/bin/pgrep" && args[0] === "-x") cb(null, "1\n", "");
			else if (file === "/usr/bin/pgrep") cb(null, "3161\n", "");
			else if (file === "/bin/ps" && isDetailPs(args)) cb(null, "1 9 ttys001 claude\n", "");
			else if (file === "/bin/ps") cb(failure({ code: 1 }), "", "");
			else cb(null, "p1\nfcwd\nn/Users/j/x\n", "");
		});
		expect(await scanClaudeSnapshot(exec as unknown as ExecFileLike))
			.toEqual({ status: "ok", instances: ONE });
	});

	describe("fresh scans (press path)", () => {
		it("bypasses a warm world cache", async () => {
			const exec = healthyExec();
			await scanClaudeSnapshot(exec as unknown as ExecFileLike); // warms the 2s world cache
			const before = exec.mock.calls.length;
			await scanClaudeSnapshot(exec as unknown as ExecFileLike, { fresh: true });
			// A cache hit would have made zero further calls; fresh must probe again.
			expect(exec.mock.calls.length).toBeGreaterThan(before);
		});

		/** A1: bypassing only the world cache would still answer from a cwd
		 * observed up to 60s ago — the per-pid memo has to be bypassed too. */
		it("bypasses the 60s cwd memo (A1): a warm memo still gets a fresh lsof for every pid", async () => {
			const exec = healthyExec();
			await scanClaudeSnapshot(exec as unknown as ExecFileLike); // memoises pid 1's cwd
			const lsofBefore = exec.mock.calls.filter((c) => c[0] === "/usr/sbin/lsof").length;
			expect(lsofBefore).toBe(1);
			await scanClaudeSnapshot(exec as unknown as ExecFileLike, { fresh: true });
			const lsofAfter = exec.mock.calls.filter((c) => c[0] === "/usr/sbin/lsof").length;
			expect(lsofAfter).toBe(2); // re-probed despite the memo being warm
		});

		it("does not join an in-flight scan", async () => {
			let releaseFirst: (() => void) | null = null;
			const gate = new Promise<void>((r) => { releaseFirst = r; });
			let pgrepCalls = 0;
			const exec = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
				if (file === "/usr/bin/pgrep" && args[0] === "-x") {
					pgrepCalls++;
					const mine = pgrepCalls;
					if (mine === 1) { void gate.then(() => cb(failure({ code: 1 }), "", "")); return; }
					cb(failure({ code: 1 }), "", "");
					return;
				}
			});
			const first = scanClaudeSnapshot(exec as unknown as ExecFileLike); // in-flight, held open
			const second = scanClaudeSnapshot(exec as unknown as ExecFileLike, { fresh: true }); // must NOT join it
			releaseFirst!();
			await Promise.all([first, second]);
			expect(pgrepCalls).toBe(2); // a genuinely separate probe, not the shared in-flight one
		});

		/** A2 / A7: driven by controlling COMPLETION order, not just asserting
		 * both scans happened. The scan that started later (higher sequence
		 * number) must win the cache even though the one that started earlier
		 * happens to finish after it. */
		it("a scan that started earlier cannot publish over one that started later", async () => {
			let releaseFirst: (() => void) | null = null;
			const gate = new Promise<void>((r) => { releaseFirst = r; });
			let pgrepCalls = 0;
			const has2 = (args: readonly string[]) => args.includes("1,2");
			const exec = vi.fn((file: string, args: readonly string[], _o: unknown, cb: Cb) => {
				if (file === "/usr/bin/pgrep" && args[0] === "-x") {
					pgrepCalls++;
					if (pgrepCalls === 1) { void gate.then(() => cb(null, "1\n2\n", "")); return; } // earlier: 2 pids
					cb(null, "1\n", ""); // later: 1 pid, resolves right away
					return;
				}
				if (file === "/usr/bin/pgrep") { cb(null, "", ""); return; } // child probe: none busy
				if (file === "/bin/ps" && isDetailPs(args)) {
					cb(null, has2(args) ? "1 9 ttys001 claude\n2 9 ttys002 claude\n" : "1 9 ttys001 claude\n", "");
					return;
				}
				if (file === "/bin/ps") { cb(null, "", ""); return; }
				cb(null, has2(args) ? "p1\nfcwd\nn/Users/j/x\np2\nfcwd\nn/Users/j/y\n" : "p1\nfcwd\nn/Users/j/x\n", "");
			});
			const earlier = scanClaudeSnapshot(exec as unknown as ExecFileLike, { fresh: true }); // mySeq 1, stalls on gate
			const later = scanClaudeSnapshot(exec as unknown as ExecFileLike, { fresh: true }); // mySeq 2, races ahead
			const laterResult = await later;
			expect(laterResult.instances).toHaveLength(1); // finished and published first
			releaseFirst!();
			const earlierResult = await earlier;
			expect(earlierResult.instances).toHaveLength(2); // still its own honest answer to its caller...
			// ...but must NOT have become the shared cache, even finishing last.
			const cached = await scanClaudeSnapshot(exec as unknown as ExecFileLike);
			expect(cached.instances).toHaveLength(1);
		});
	});
});
