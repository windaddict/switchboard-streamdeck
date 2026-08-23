import { describe, expect, it, vi } from "vitest";
import type { ErrorCode, RunResult } from "../src/applescript/runner.js";
import {
	MAX_STASH_BYTES,
	parseRestore,
	parseSnapshot,
	RELEASE_SCRIPT,
	RESTORE_SCRIPT,
	restoreClipboard,
	releaseStash,
	SNAPSHOT_SCRIPT,
	snapshotClipboard,
	STASH_PASTEBOARD_NAME,
} from "../src/mac/pasteboard-stash.js";

/** Text that must never appear in a log line or a returned reason. */
const SECRET = "correct horse battery staple 🔒";

function ok(stdout: string): RunResult {
	return { ok: true, code: "success", stdout, stderr: "" };
}
function fail(code: Exclude<ErrorCode, "success">): RunResult {
	return { ok: false, code, stdout: "", stderr: "" };
}

function makeDeps() {
	const runJxaWithArgs = vi.fn<(s: string, a: readonly string[]) => Promise<RunResult>>();
	const log = vi.fn<(m: string) => void>();
	return { runJxaWithArgs, log, deps: { runJxaWithArgs, log } };
}

// ---------------------------------------------------------------------------
// Parsers. Every shape below was produced by running the real scripts against
// this Mac's pasteboard, not invented: "ok 2 570 469", "abandoned 470",
// "ok 471", "empty 472", "skip-too-big 559", "skip-concealed", "empty-stash".
// ---------------------------------------------------------------------------

describe("parseSnapshot", () => {
	it("reads the live success shape", () => {
		expect(parseSnapshot("ok 2 570 469")).toEqual({
			status: "stashed",
			items: 2,
			bytes: 570,
			changeCount: 469,
		});
		expect(parseSnapshot("ok 1 0 12\n")).toEqual({ status: "stashed", items: 1, bytes: 0, changeCount: 12 });
	});

	it("maps every skip to a fixed reason", () => {
		expect(parseSnapshot("empty 472")).toEqual({ status: "none", reason: "empty" });
		expect(parseSnapshot("skip-concealed")).toEqual({ status: "none", reason: "concealed" });
		expect(parseSnapshot("skip-too-big 559")).toEqual({ status: "none", reason: "too-big" });
	});

	/** Every fail collapses to one reason. The script's own reason is not
	 * carried out of the parser: the caller logs whatever it is handed, and a
	 * failing script's stdout is not a value this feature is willing to log. */
	it("collapses every failure to 'failed' without carrying the text out", () => {
		for (const out of ["fail-items", "fail-unreadable", "fail-moved", "fail-stash-write", "fail-read"]) {
			expect(parseSnapshot(out)).toEqual({ status: "none", reason: "failed" });
		}
	});

	it("returns null for anything unrecognised rather than guessing", () => {
		expect(parseSnapshot("")).toBeNull();
		expect(parseSnapshot(SECRET)).toBeNull();
		expect(parseSnapshot("ok 2 570")).toBeNull();
		expect(parseSnapshot("ok two 570 469")).toBeNull();
		// A changeCount past 2^53 is not silently rounded into a match.
		expect(parseSnapshot("ok 1 1 99999999999999999999")).toBeNull();
	});
});

describe("parseRestore", () => {
	it("reads the live shapes", () => {
		expect(parseRestore("ok 471")).toEqual({ status: "restored", changeCount: 471 });
		expect(parseRestore("abandoned 470")).toEqual({ status: "abandoned" });
		expect(parseRestore("empty-stash")).toEqual({ status: "failed" });
	});

	/** The one failure that is not like the others: the clipboard was emptied
	 * and could not be refilled, so the operator has actually lost something
	 * and has to be told rather than logged at. */
	it("distinguishes a failure AFTER the clear from every other failure", () => {
		expect(parseRestore("fail-after-clear")).toEqual({ status: "lost" });
		expect(parseRestore("fail-build")).toEqual({ status: "failed" });
		expect(parseRestore("fail-stash-unreadable")).toEqual({ status: "failed" });
	});

	it("returns null for anything unrecognised", () => {
		expect(parseRestore("")).toBeNull();
		expect(parseRestore(SECRET)).toBeNull();
		expect(parseRestore("ok")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

describe("snapshotClipboard", () => {
	it("passes the stash name and the cap, and reports what was saved", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockResolvedValue(ok("ok 2 570 469"));
		expect(await snapshotClipboard(d.deps)).toEqual({
			status: "stashed",
			items: 2,
			bytes: 570,
			changeCount: 469,
		});
		expect(d.runJxaWithArgs).toHaveBeenCalledWith(SNAPSHOT_SCRIPT, [
			STASH_PASTEBOARD_NAME,
			String(MAX_STASH_BYTES),
		]);
	});

	/** Failing to SAVE the clipboard must never cost the operator the gesture
	 * they actually asked for. Every failure is "nothing to restore", never a
	 * refusal to continue. */
	it("degrades to 'nothing to restore' on a failed script, and never throws", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockResolvedValue(fail("permission-denied"));
		expect(await snapshotClipboard(d.deps)).toEqual({ status: "none", reason: "failed" });

		const g = makeDeps();
		g.runJxaWithArgs.mockResolvedValue(ok("something unexpected"));
		expect(await snapshotClipboard(g.deps)).toEqual({ status: "none", reason: "failed" });
	});

	it("never logs the script's raw output", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockResolvedValue(ok(SECRET));
		await snapshotClipboard(d.deps);
		for (const [line] of d.log.mock.calls) expect(line).not.toContain(SECRET);
	});
});

describe("restoreClipboard", () => {
	it("passes the expected changeCount, then releases the stash", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockImplementation(async (script) =>
			script === RESTORE_SCRIPT ? ok("ok 471") : ok("ok"),
		);
		const snapshot = { status: "stashed", items: 2, bytes: 570, changeCount: 469 } as const;
		expect(await restoreClipboard(d.deps, snapshot, 470)).toEqual({ status: "restored", changeCount: 471 });
		expect(d.runJxaWithArgs).toHaveBeenNthCalledWith(1, RESTORE_SCRIPT, [STASH_PASTEBOARD_NAME, "470"]);
		expect(d.runJxaWithArgs).toHaveBeenNthCalledWith(2, RELEASE_SCRIPT, [STASH_PASTEBOARD_NAME]);
	});

	/** A stash that outlives its gesture is a copy of the operator's data
	 * sitting somewhere they don't know about, so it is released on every
	 * outcome that left the clipboard intact. */
	it("releases the stash on every outcome that left the clipboard intact", async () => {
		for (const out of ["abandoned 470", "fail-build", "empty-stash"]) {
			const d = makeDeps();
			d.runJxaWithArgs.mockImplementation(async (script) =>
				script === RESTORE_SCRIPT ? ok(out) : ok("ok"),
			);
			await restoreClipboard(d.deps, { status: "stashed", items: 1, bytes: 1, changeCount: 1 }, 1);
			expect(d.runJxaWithArgs).toHaveBeenCalledWith(RELEASE_SCRIPT, [STASH_PASTEBOARD_NAME]);
		}
	});

	/** The ONE case where holding on is right: the clipboard was cleared and
	 * the rewrite failed, so the stash is the only surviving copy of what the
	 * operator had. Releasing it here would turn a recoverable failure into
	 * permanent loss. It is cleaned up at the next plugin start instead. */
	it("KEEPS the stash when the restore failed after clearing the clipboard", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockImplementation(async (script) =>
			script === RESTORE_SCRIPT ? ok("fail-after-clear") : ok("ok"),
		);
		expect(
			await restoreClipboard(d.deps, { status: "stashed", items: 1, bytes: 1, changeCount: 1 }, 1),
		).toEqual({ status: "lost" });
		expect(d.runJxaWithArgs).not.toHaveBeenCalledWith(RELEASE_SCRIPT, [STASH_PASTEBOARD_NAME]);
	});

	/** Unrecognised output means we cannot tell whether the clipboard was
	 * cleared, so the stash is kept for the same reason. */
	it("keeps the stash when it cannot tell what the restore did", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockImplementation(async (script) =>
			script === RESTORE_SCRIPT ? ok("garbage") : ok("ok"),
		);
		expect(
			await restoreClipboard(d.deps, { status: "stashed", items: 1, bytes: 1, changeCount: 1 }, 1),
		).toEqual({ status: "failed" });
		expect(d.runJxaWithArgs).not.toHaveBeenCalledWith(RELEASE_SCRIPT, [STASH_PASTEBOARD_NAME]);
	});

	it("releases the stash even when the restore script itself fails to run", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockImplementation(async (script) =>
			script === RESTORE_SCRIPT ? fail("script-error") : ok("ok"),
		);
		expect(await restoreClipboard(d.deps, { status: "stashed", items: 1, bytes: 1, changeCount: 1 }, 1)).toEqual({
			status: "failed",
		});
		expect(d.runJxaWithArgs).toHaveBeenCalledWith(RELEASE_SCRIPT, [STASH_PASTEBOARD_NAME]);
	});

	/** Nothing was stashed, so there is nothing to put back — and crucially no
	 * restore script runs, which would otherwise write a STALE stash from an
	 * earlier gesture over the operator's current clipboard. */
	it("does nothing at all when the snapshot saved nothing", async () => {
		for (const reason of ["empty", "concealed", "too-big", "disabled", "failed"] as const) {
			const d = makeDeps();
			expect(await restoreClipboard(d.deps, { status: "none", reason }, 470)).toEqual({ status: "failed" });
			expect(d.runJxaWithArgs).not.toHaveBeenCalled();
		}
	});
});

describe("releaseStash", () => {
	it("is safe to call when no stash exists — this is what startup cleanup does", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockResolvedValue(ok("ok"));
		expect(await releaseStash(d.deps)).toBe(true);
		expect(d.runJxaWithArgs).toHaveBeenCalledWith(RELEASE_SCRIPT, [STASH_PASTEBOARD_NAME]);
	});

	it("does not throw when the release script fails to run", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockResolvedValue(fail("script-error"));
		expect(await releaseStash(d.deps)).toBe(false);
	});

	/** RELEASE_SCRIPT catches its own exceptions and reports them on STDOUT, so
	 * osascript exits 0 either way. Checking only the exit status would read a
	 * failed release as a successful one and leave a copy of the operator's
	 * clipboard in the pasteboard server, unnoticed. */
	it("treats a fail-release reported on stdout as a failure, not a success", async () => {
		const d = makeDeps();
		d.runJxaWithArgs.mockResolvedValue(ok("fail-release"));
		expect(await releaseStash(d.deps)).toBe(false);
		expect(d.log.mock.calls.some(([m]) => m.includes("could not be released"))).toBe(true);
	});
});

describe("the scripts themselves", () => {
	/** The stash name reaches the scripts as an ARGUMENT, never spliced into
	 * their source — the same rule the snippet text follows. */
	it("take the pasteboard name via argv rather than interpolation", () => {
		expect(SNAPSHOT_SCRIPT).not.toContain(STASH_PASTEBOARD_NAME);
		expect(RESTORE_SCRIPT).not.toContain(STASH_PASTEBOARD_NAME);
		expect(RELEASE_SCRIPT).not.toContain(STASH_PASTEBOARD_NAME);
		for (const s of [SNAPSHOT_SCRIPT, RESTORE_SCRIPT, RELEASE_SCRIPT]) expect(s).toContain("argv[0]");
	});

	/** clearContents empties a named pasteboard but leaks the pasteboard
	 * itself; releaseGlobally is what actually gives it back. */
	it("release the pasteboard rather than merely clearing it", () => {
		expect(RELEASE_SCRIPT).toContain("releaseGlobally");
	});

	/** Bridged ObjC numbers concatenate as strings in JXA — `bytes += d.length`
	 * produced "02617516011" on this Mac. Every arithmetic use is coerced. */
	it("coerce bridged lengths and counts with Number()", () => {
		expect(SNAPSHOT_SCRIPT).toContain("Number(d.length)");
		expect(SNAPSHOT_SCRIPT).toContain("Number(gen.changeCount)");
	});

	/** The concealed check must precede any read of the data, or a password is
	 * materialised before we decide not to keep it. */
	it("check for concealed content before reading any representation", () => {
		expect(SNAPSHOT_SCRIPT.indexOf("skip-concealed")).toBeLessThan(SNAPSHOT_SCRIPT.indexOf("dataForType"));
	});

	/** Everything must be built before the general pasteboard is emptied, or a
	 * failure mid-restore leaves the operator with nothing. */
	/** Between clearContents and a successful writeObjects the operator has NO
	 * clipboard, so a single failed attempt is not an acceptable place to give
	 * up — the built items are still in hand. */
	it("retry the write rather than abandoning a cleared clipboard", () => {
		expect(RESTORE_SCRIPT).toContain("attempt < 3");
		expect(RESTORE_SCRIPT.indexOf("attempt")).toBeLessThan(RESTORE_SCRIPT.indexOf("fail-after-clear"));
	});

	it("build every destination item before clearing the general pasteboard", () => {
		expect(RESTORE_SCRIPT.indexOf("copies.push")).toBeLessThan(RESTORE_SCRIPT.indexOf("gen.clearContents"));
		expect(RESTORE_SCRIPT.indexOf("abandoned")).toBeLessThan(RESTORE_SCRIPT.indexOf("gen.clearContents"));
	});
});
