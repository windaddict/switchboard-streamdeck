import { describe, it, expect, vi } from "vitest";
import {
	findTmuxPath,
	runTmux,
	LIST_WINDOWS_ARGS,
	LIST_CLIENTS_ARGS,
	type ExecFileLike,
} from "../src/mac/tmux-runner.js";

describe("findTmuxPath", () => {
	it("prefers Homebrew arm64 path when present", () => {
		expect(findTmuxPath((p) => p === "/opt/homebrew/bin/tmux")).toBe("/opt/homebrew/bin/tmux");
	});
	it("falls back to /usr/local then /usr/bin", () => {
		expect(findTmuxPath((p) => p === "/usr/local/bin/tmux")).toBe("/usr/local/bin/tmux");
		expect(findTmuxPath((p) => p === "/usr/bin/tmux")).toBe("/usr/bin/tmux");
	});
	it("falls back to bare 'tmux' when nothing exists", () => {
		expect(findTmuxPath(() => false)).toBe("tmux");
	});
});

describe("arg constants", () => {
	it("list-windows uses an all-sessions pipe format", () => {
		expect(LIST_WINDOWS_ARGS).toEqual([
			"list-windows",
			"-a",
			"-F",
			"#{session_name}|#{window_index}|#{window_active}|#{window_name}",
		]);
	});
	it("list-clients maps tty to session", () => {
		expect(LIST_CLIENTS_ARGS).toEqual(["list-clients", "-F", "#{client_tty}|#{client_session}"]);
	});
});

describe("runTmux", () => {
	it("invokes the resolved binary with args and returns stdout", async () => {
		const exec = vi.fn((_f, _a, _o, cb) => cb(null, "dev|2|movingavg|0\n", ""));
		const res = await runTmux(LIST_WINDOWS_ARGS, "/opt/homebrew/bin/tmux", exec as unknown as ExecFileLike);
		expect(exec).toHaveBeenCalledWith(
			"/opt/homebrew/bin/tmux",
			LIST_WINDOWS_ARGS,
			expect.objectContaining({ timeout: expect.any(Number) }),
			expect.any(Function),
		);
		expect(res).toEqual({ ok: true, stdout: "dev|2|movingavg|0\n", stderr: "" });
	});

	it("reports ok:false on error", async () => {
		const exec = vi.fn((_f, _a, _o, cb) => cb(new Error("no server"), "", "no server running"));
		const res = await runTmux(["list-windows"], "tmux", exec as unknown as ExecFileLike);
		expect(res.ok).toBe(false);
		expect(res.stderr).toContain("no server");
	});
});
