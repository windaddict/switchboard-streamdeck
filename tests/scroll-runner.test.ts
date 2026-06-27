import { describe, it, expect, vi } from "vitest";
import { scrollHelperPath, runScroll, type ExecFileLike } from "../src/mac/scroll-runner.js";

const BASE = "file:///Users/x/Plugins/com.movingavg.switchboard.sdPlugin/bin/plugin.js";
const EXPECTED_BIN = "/Users/x/Plugins/com.movingavg.switchboard.sdPlugin/bin/macos/scroll";

describe("scrollHelperPath", () => {
	it("resolves the helper next to the bundle under macos/scroll", () => {
		expect(scrollHelperPath(BASE)).toBe(EXPECTED_BIN);
	});
});

describe("runScroll", () => {
	it("is a no-op for 0 lines and does not spawn", async () => {
		const exec = vi.fn();
		const res = await runScroll(0, BASE, exec as unknown as ExecFileLike);
		expect(res).toEqual({ ok: true, trusted: true });
		expect(exec).not.toHaveBeenCalled();
	});

	it("invokes the helper binary with the signed line count as a string", async () => {
		const exec = vi.fn((_file, _args, cb) => cb(null, "ok\n", ""));
		const res = await runScroll(6, BASE, exec as unknown as ExecFileLike);
		expect(exec).toHaveBeenCalledWith(EXPECTED_BIN, ["6"], expect.any(Function));
		expect(res).toEqual({ ok: true, trusted: true });
	});

	it("passes negative line counts through", async () => {
		const exec = vi.fn((_file, _args, cb) => cb(null, "ok\n", ""));
		await runScroll(-12, BASE, exec as unknown as ExecFileLike);
		expect(exec).toHaveBeenCalledWith(EXPECTED_BIN, ["-12"], expect.any(Function));
	});

	it("reports trusted:false when the helper prints 'untrusted'", async () => {
		const exec = vi.fn((_file, _args, cb) => cb(null, "ok\n", "untrusted\n"));
		const res = await runScroll(3, BASE, exec as unknown as ExecFileLike);
		expect(res).toEqual({ ok: true, trusted: false });
	});

	it("reports ok:false on a spawn error", async () => {
		const exec = vi.fn((_file, _args, cb) => cb(new Error("ENOENT"), "", ""));
		const res = await runScroll(3, BASE, exec as unknown as ExecFileLike);
		expect(res.ok).toBe(false);
	});
});
