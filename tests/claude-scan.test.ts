import { describe, expect, it, vi } from "vitest";
import {
	type ExecFileLike,
	lsofCwdArgs,
	processRunning,
	PS_CLAUDE_ARGS,
	scanClaudeInstances,
} from "../src/mac/claude-scan.js";

describe("scanClaudeInstances", () => {
	it("chains ps -> batched lsof and joins pid/tty/cwd", async () => {
		const calls: Array<{ file: string; args: readonly string[] }> = [];
		const exec = vi.fn((file, args, _o, cb) => {
			calls.push({ file, args });
			if (file === "/bin/ps") {
				cb(null, "1120 1 ttys019 claude\n14251 1 ttys001 claude\n3161 1120 ?? /bin/zsh -c source /u/.claude/shell-snapshots/snapshot-z.sh\n", "");
			} else {
				cb(null, "p1120\nfcwd\nn/Users/j/code/a\np14251\nfcwd\nn/Users/j/code/b\n", "");
			}
		});
		const got = await scanClaudeInstances(exec as unknown as ExecFileLike);
		expect(got).toEqual([
			{ pid: 1120, tty: "/dev/ttys019", cwd: "/Users/j/code/a", shellBusy: true },
			{ pid: 14251, tty: "/dev/ttys001", cwd: "/Users/j/code/b", shellBusy: false },
		]);
		expect(calls[0]).toEqual({ file: "/bin/ps", args: PS_CLAUDE_ARGS });
		expect(calls[1].file).toBe("/usr/sbin/lsof");
		expect(calls[1].args).toEqual(lsofCwdArgs([1120, 14251]));
	});
	it("no claude processes -> no lsof call, empty result", async () => {
		const exec = vi.fn((_f, _a, _o, cb) => cb(null, "", ""));
		expect(await scanClaudeInstances(exec as unknown as ExecFileLike)).toEqual([]);
		expect(exec).toHaveBeenCalledTimes(1);
	});
	it("drops instances whose cwd could not be resolved", async () => {
		const exec = vi.fn((file, _a, _o, cb) => {
			if (file === "/bin/ps") cb(null, "1 9 ttys001 claude\n2 9 ttys002 claude\n", "");
			else cb(null, "p1\nfcwd\nn/Users/j/x\n", "");
		});
		const got = await scanClaudeInstances(exec as unknown as ExecFileLike);
		expect(got).toEqual([{ pid: 1, tty: "/dev/ttys001", cwd: "/Users/j/x", shellBusy: false }]);
	});
	it("a failed ps yields an empty scan (never throws into the poll)", async () => {
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
