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
