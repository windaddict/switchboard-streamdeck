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
	it("chains pgrep -> targeted ps -> pgrep -P -> confirm -> batched lsof", async () => {
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
		expect(calls[0]).toEqual({ file: "/usr/bin/pgrep", args: PGREP_CLAUDE_ARGS });
		expect(calls[1]).toEqual({ file: "/bin/ps", args: claudeDetailArgs([1120, 14251]) });
		expect(calls[2]).toEqual({ file: "/usr/bin/pgrep", args: childPidsArgs([1120, 14251]) });
		expect(calls[3]).toEqual({ file: "/bin/ps", args: confirmShellArgs([3161]) });
		expect(calls[4].file).toBe("/usr/sbin/lsof");
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
});
