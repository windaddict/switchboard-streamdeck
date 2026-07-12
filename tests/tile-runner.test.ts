import { describe, expect, it, vi } from "vitest";
import { type ExecFileLike, runTile, tileHelperPath } from "../src/mac/tile-runner.js";

const BASE = "file:///Users/x/Plugins/com.movingavg.switchboard.sdPlugin/bin/plugin.js";
const CELL = { x: 0, y: 0, w: 0.5, h: 0.5 };

describe("tileHelperPath", () => {
	it("resolves the helper next to the bundle under macos/tile", () => {
		expect(tileHelperPath(BASE)).toBe(
			"/Users/x/Plugins/com.movingavg.switchboard.sdPlugin/bin/macos/tile",
		);
	});
});

describe("runTile", () => {
	it("passes a timeout so a stuck helper cannot hang the handler", async () => {
		const exec = vi.fn((_f, _a, opts, cb) => {
			expect(opts).toEqual({ timeout: 4000 });
			cb(null, "ok\n", "");
		});
		const res = await runTile(CELL, BASE, exec as unknown as ExecFileLike);
		expect(res).toEqual({ ok: true, trusted: true });
	});

	it("treats ANY stderr as operational failure — the helper always exits 0", async () => {
		// tile.swift's fail() prints the reason and exits 0 by design; the
		// runner must not report a move that never happened.
		const exec = vi.fn((_f, _a, _o, cb) => cb(null, "ok\n", "no-window\n"));
		const res = await runTile(CELL, BASE, exec as unknown as ExecFileLike);
		expect(res.ok).toBe(false);
		expect(res.trusted).toBe(true);
	});

	it("untrusted is both a failure and an Accessibility signal", async () => {
		const exec = vi.fn((_f, _a, _o, cb) => cb(null, "ok\n", "untrusted\n"));
		const res = await runTile(CELL, BASE, exec as unknown as ExecFileLike);
		expect(res).toEqual({ ok: false, trusted: false });
	});

	it("spawn errors are failures", async () => {
		const exec = vi.fn((_f, _a, _o, cb) => cb(new Error("ENOENT"), "", ""));
		const res = await runTile(CELL, BASE, exec as unknown as ExecFileLike);
		expect(res.ok).toBe(false);
	});
});
