/**
 * WHAT IT'S FOR: putting the operator's clipboard back the way they left it.
 *
 * Paste Snippet delivers text through the system clipboard (⌘C to capture,
 * ⌘V to insert — the Accessibility alternatives were measured unusable; see
 * `clipboard-snippet.ts`). That used to mean every gesture silently replaced
 * whatever the operator had copied. This module saves the clipboard before a
 * gesture and restores it afterwards, so the key stops costing them the thing
 * they were carrying.
 *
 * THE EXACT GUARANTEE, which is narrower than "your clipboard is preserved":
 * an **eager, byte-for-byte reconstruction of the representations that could
 * be read at snapshot time, up to {@link MAX_STASH_BYTES} in total**. Not a
 * semantic snapshot, and not unbounded. A clipboard over the cap is NOT saved
 * and the gesture replaces it, exactly as it did before restoration existed.
 * The difference is load-bearing — see LIMITS below.
 *
 * MECHANISM — a stash pasteboard. A clipboard is not a string: the general
 * pasteboard holds an array of items, each carrying several representations
 * at once (plain text AND rich text AND an image AND a file URL AND private
 * app types). Reading `public.utf8-plain-text` and writing it back would
 * silently destroy the rest. So the snapshot copies item by item, type by
 * type, into a second pasteboard owned by this plugin
 * (`NSPasteboard.pasteboardWithName`), which lives in the pasteboard server
 * and can be written by one `osascript` process and read by another. Measured
 * on a real Mac: a two-item clipboard carrying a PNG, HTML, emoji text and a
 * marker type round-tripped byte-identically, and a `public.file-url` still
 * resolved as a file afterwards.
 *
 * WHERE THE BYTES GO — stated precisely, because an earlier draft of this got
 * it wrong. The representations are read with `dataForType`, which
 * materialises each one **in the osascript child process's memory**. They
 * never enter the Node plugin process, never cross stdout, never touch disk
 * and never reach a log line — Node sees only a name and some integers — but
 * "never in this plugin's memory" would be false. There is no way around it:
 * writing the source items straight to another pasteboard throws *"Cannot
 * write pasteboard item… It is already associated with another pasteboard"*,
 * so a promise cannot be moved as a promise; it must be materialised.
 *
 * CONCEALED CLIPBOARDS ARE NOT SNAPSHOTTED AT ALL. If what's already on the
 * clipboard carries `org.nspasteboard.ConcealedType` — the marker password
 * managers set — this module declines and the gesture behaves as it did
 * before restoration existed. Duplicating a password into a second pasteboard
 * is an exposure the operator did not previously have, and a crash would
 * leave the copy sitting there. Declining also has a benign side effect: the
 * snippet overwrites the password on the clipboard, which is where the
 * manager's own auto-clear was heading anyway.
 *
 * ALL OR NOTHING. Any unreadable representation, any exception, any failed
 * write, or any movement in the source pasteboard mid-snapshot abandons the
 * whole snapshot and restores nothing. A partial clipboard restored over a
 * real one is worse than not restoring: the operator would get *some* of what
 * they had and no way to tell which part is missing.
 *
 * LIMITS, all of them:
 *   - **Promised/lazy data is materialised.** A file promise or an image
 *     generated on demand is resolved and stored as ordinary bytes; the
 *     promise semantics are gone. A provider that times out or returns nil
 *     aborts the snapshot (see ALL OR NOTHING).
 *   - **A clipboard over {@link MAX_STASH_BYTES} is not saved,** so the
 *     gesture replaces it. This is logged; it is not surfaced on the key,
 *     because the gesture itself succeeded and an alert would say otherwise.
 *   - **An EMPTY clipboard is not restored.** If there was nothing on it, the
 *     gesture's text is simply left there. Putting "nothing" back would mean
 *     clearing the operator's clipboard on their behalf, which is a
 *     destructive act to correct a cosmetic one.
 *   - **The pasteboard owner changes.** An app relying on owner callbacks for
 *     lazy provision sees this plugin as the owner after a restore.
 *   - **The restore is not atomic.** Compare, clear and write are separate
 *     operations and NSPasteboard has no compare-and-swap. Every destination
 *     item is built and validated BEFORE the clear, so the window is as small
 *     as the API allows — but a foreign write landing inside it is lost.
 *   - **changeCount advances several times,** so a clipboard manager records
 *     our writes. The restore of the operator's own content is deliberately
 *     NOT marked transient — it is their real clipboard — so it may appear in
 *     their history as a fresh copy of something they already had.
 *   - **One failure can still cost the operator their clipboard.** If the
 *     rewrite fails after the clear — three attempts, so it should not happen
 *     — the clipboard is left empty. The stash is then deliberately NOT
 *     released, so the copy survives for the next plugin start to clean up,
 *     and the key alerts rather than only logging.
 *   - Untested on older macOS versions, and against any pasteboard-access
 *     prompt or denial. Every OTHER failure path leaves the general pasteboard
 *     untouched.
 */

import type { RunResult } from "../applescript/runner.js";

/**
 * The stash pasteboard's name.
 *
 * DELIBERATELY FIXED, not unique per gesture — the opposite of what an
 * independent review recommended, and the reasoning is worth keeping because
 * it is not obvious. macOS offers **no way to enumerate named pasteboards**.
 * A unique name is therefore unrecoverable once its process dies: if the
 * plugin is killed mid-gesture, that stash keeps a copy of the operator's
 * clipboard until reboot and nothing can ever find it again. A fixed name is
 * always recoverable — {@link RELEASE_SCRIPT} at plugin startup clears any
 * stash a previous run left behind, which closes the leak completely.
 *
 * What the fixed name costs: the name is predictable, so another process
 * could read the stash during the ~1.5s it exists. That is a small exposure
 * because the same content is simultaneously sitting on the GENERAL
 * pasteboard, which every process can read anyway and for longer — and
 * because concealed content is never stashed at all. The other cost is that
 * two plugin processes running at once would share one stash; Stream Deck
 * runs a single plugin process, and gestures within it are serialized.
 */
export const STASH_PASTEBOARD_NAME = "com.movingavg.switchboard.clipboard-stash";

/**
 * The serialize() key every clipboard gesture shares — and the startup
 * cleanup with them.
 *
 * The resource being serialized is the system clipboard and the single stash
 * pasteboard, both global, so this is deliberately NOT per-key. The startup
 * release runs in the same lane: it clears and releases the very pasteboard a
 * gesture may be using, so letting it run concurrently would let it destroy
 * the first gesture's stash mid-flight.
 */
export const CLIPBOARD_LANE = "paste-snippet:clipboard";

/** The marker password managers set on a copied secret. A clipboard carrying
 * it is never stashed. */
const CONCEALED_TYPE = "org.nspasteboard.ConcealedType";

/** Ceiling on a snapshot, in bytes, summed across every item and every
 * representation. Above it the snapshot is skipped and the gesture proceeds
 * exactly as it did before restoration existed — which means the operator
 * loses that clipboard, so the number matters.
 *
 * 64 MiB, not a smaller round number, because of what macOS actually puts on
 * the clipboard: a copied image carries an UNCOMPRESSED TIFF representation
 * alongside any PNG, and a full-screen Retina screenshot is roughly
 * 3024x1964x4 ≈ 24 MB in that form alone. An 8 MiB cap — the first value here
 * — would therefore have silently failed to protect the single most valuable
 * thing a clipboard usually holds.
 *
 * Note what this does and does NOT bound: it limits what we DUPLICATE and
 * HOLD, not what we READ. A representation's size is only knowable by reading
 * it, so a single enormous item is already materialised by the time the cap
 * notices. It stops us keeping a second copy of it, nothing more. */
export const MAX_STASH_BYTES = 64 * 1024 * 1024;

/**
 * JXA: copy the general pasteboard into the stash, item by item and type by
 * type. argv: `[stashName, maxBytes]`.
 *
 * Returns one of:
 *   - `ok <items> <bytes> <changeCount>` — stashed; `changeCount` is the
 *     source pasteboard's, unmoved across the whole read.
 *   - `empty <changeCount>` — nothing on the clipboard to save.
 *   - `skip-concealed` — the clipboard holds a secret; see the module header.
 *   - `skip-too-big <bytes>` — over the cap.
 *   - `fail-<reason>` — anything else; nothing is stashed and nothing is to
 *     be restored.
 *
 * `Number()` is not decoration: bridged ObjC numbers concatenate as strings
 * in JXA (`bytes += d.length` produced `02617516011` while this was being
 * built), so every arithmetic use of one is coerced explicitly.
 */
export const SNAPSHOT_SCRIPT = `function run(argv) {
	ObjC.import("AppKit");
	var name = argv[0];
	var maxBytes = Number(argv[1]);
	var gen = $.NSPasteboard.generalPasteboard;
	var before = Number(gen.changeCount);
	var items = gen.pasteboardItems;
	if (items.isNil()) return "fail-items";
	var count = Number(items.count);
	if (count === 0) return "empty " + before;

	// Refuse a concealed clipboard before reading ANY of it.
	for (var c = 0; c < count; c++) {
		var ctypes = items.objectAtIndex(c).types;
		if (ctypes.isNil()) return "fail-types";
		for (var ct = 0; ct < Number(ctypes.count); ct++) {
			if (ObjC.unwrap(ctypes.objectAtIndex(ct)) === ${JSON.stringify(CONCEALED_TYPE)}) return "skip-concealed";
		}
	}

	var copies = [];
	var bytes = 0;
	try {
		for (var i = 0; i < count; i++) {
			var src = items.objectAtIndex(i);
			var dst = $.NSPasteboardItem.alloc.init;
			var types = src.types;
			if (types.isNil()) return "fail-types";
			for (var t = 0; t < Number(types.count); t++) {
				var ty = types.objectAtIndex(t);
				var d = src.dataForType(ty);
				// A lazy provider that timed out or declined lands here. All
				// or nothing: a partial clipboard is worse than none.
				if (d.isNil()) return "fail-unreadable";
				bytes += Number(d.length);
				if (bytes > maxBytes) return "skip-too-big " + bytes;
				if (!dst.setDataForType(d, ty)) return "fail-setdata";
			}
			copies.push(dst);
		}
	} catch (e) {
		return "fail-read";
	}

	// The pasteboard must not have moved while we were reading it; items go
	// stale when ownership changes and would yield a torn snapshot.
	var after = Number(gen.changeCount);
	if (after !== before) return "fail-moved";

	try {
		var stash = $.NSPasteboard.pasteboardWithName($(name));
		stash.clearContents;
		if (!stash.writeObjects($(copies))) return "fail-stash-write";
	} catch (e) {
		return "fail-stash";
	}
	return "ok " + count + " " + bytes + " " + after;
}`;

/**
 * JXA: put the stash back on the general pasteboard. argv:
 * `[stashName, expectedChangeCount]`.
 *
 * `expectedChangeCount` is the count OUR OWN gesture last produced. If the
 * general pasteboard has moved past it, somebody else has copied something
 * since and we abandon: their fresh copy is worth more than our restore, and
 * we cannot know whose write should survive.
 *
 * Every destination item is constructed and validated BEFORE `clearContents`
 * is called, so the interval in which the clipboard is empty is as short as
 * the API permits and a failure while building cannot leave it empty.
 *
 * Returns `ok <changeCount>`, `abandoned <changeCount>`, `empty-stash`, or
 * `fail-<reason>`. `fail-after-clear` is the one that matters: it means the
 * clipboard was emptied and the rewrite failed, so the operator has lost it
 * and must be told rather than quietly logged at.
 */
export const RESTORE_SCRIPT = `function run(argv) {
	ObjC.import("AppKit");
	var name = argv[0];
	var expected = Number(argv[1]);
	var gen = $.NSPasteboard.generalPasteboard;
	var stash = $.NSPasteboard.pasteboardWithName($(name));

	var items = stash.pasteboardItems;
	if (items.isNil()) return "fail-stash-items";
	var count = Number(items.count);
	if (count === 0) return "empty-stash";

	// Build everything first. Nothing below this point may fail before the
	// general pasteboard is whole again.
	var copies = [];
	try {
		for (var i = 0; i < count; i++) {
			var src = items.objectAtIndex(i);
			var dst = $.NSPasteboardItem.alloc.init;
			var types = src.types;
			if (types.isNil()) return "fail-stash-types";
			for (var t = 0; t < Number(types.count); t++) {
				var ty = types.objectAtIndex(t);
				var d = src.dataForType(ty);
				if (d.isNil()) return "fail-stash-unreadable";
				if (!dst.setDataForType(d, ty)) return "fail-build";
			}
			copies.push(dst);
		}
	} catch (e) {
		return "fail-build";
	}

	// As close to the clear as it can be. Not atomic — see the module header.
	var now = Number(gen.changeCount);
	if (now !== expected) return "abandoned " + now;

	// The clipboard is empty from here until writeObjects lands, so retry
	// rather than giving up on the first failure: the built items are still in
	// hand and this is the operator's real clipboard we are holding.
	for (var attempt = 0; attempt < 3; attempt++) {
		try {
			gen.clearContents;
			if (gen.writeObjects($(copies))) return "ok " + Number(gen.changeCount);
		} catch (e) {
			// fall through to the next attempt
		}
	}
	return "fail-after-clear";
}`;

/** JXA: clear AND release the stash. argv: `[stashName]`.
 *
 * `clearContents` alone empties a named pasteboard but leaks the pasteboard
 * itself; `releaseGlobally` is what actually gives it back. Run on every
 * terminal path — success, abandon and failure alike — and once at plugin
 * startup, which is what makes the fixed stash name recoverable after a
 * crash (see {@link STASH_PASTEBOARD_NAME}). */
export const RELEASE_SCRIPT = `function run(argv) {
	ObjC.import("AppKit");
	try {
		var pb = $.NSPasteboard.pasteboardWithName($(argv[0]));
		pb.clearContents;
		pb.releaseGlobally;
	} catch (e) {
		return "fail-release";
	}
	return "ok";
}`;

/** What a snapshot attempt produced. `none` means there is nothing to restore
 * later — for any reason, deliberate or not — and is what every caller should
 * check before attempting a restore. */
export type SnapshotResult =
	| { status: "stashed"; items: number; bytes: number; changeCount: number }
	| { status: "none"; reason: SnapshotSkip };

/** Why a snapshot yielded nothing to restore. Every value is a fixed token,
 * safe to log: none of them carries any part of the clipboard. */
export type SnapshotSkip =
	| "empty"
	| "concealed"
	| "too-big"
	| "disabled"
	/** Saved successfully, then dropped: the clipboard moved between the save
	 * and the gesture, so the stash was a picture of the past. */
	| "stale"
	| "failed";

/** Parse {@link SNAPSHOT_SCRIPT}'s output. Null on anything unrecognised —
 * never partially trusted, and the unrecognised text is never returned to a
 * caller that might log it. */
export function parseSnapshot(output: string): SnapshotResult | null {
	const trimmed = output.trim();
	const ok = /^ok (\d+) (\d+) (-?\d+)$/.exec(trimmed);
	if (ok) {
		const [items, bytes, changeCount] = [Number(ok[1]), Number(ok[2]), Number(ok[3])];
		if (!Number.isSafeInteger(changeCount)) return null;
		return { status: "stashed", items, bytes, changeCount };
	}
	if (/^empty(\s|$)/.test(trimmed)) return { status: "none", reason: "empty" };
	if (trimmed === "skip-concealed") return { status: "none", reason: "concealed" };
	if (/^skip-too-big(\s|$)/.test(trimmed)) return { status: "none", reason: "too-big" };
	if (/^fail-/.test(trimmed)) return { status: "none", reason: "failed" };
	return null;
}

/** What a restore attempt did. */
export type RestoreResult =
	| { status: "restored"; changeCount: number }
	/** Something else wrote to the clipboard during the gesture, so the
	 * operator's newer copy was left alone. */
	| { status: "abandoned" }
	/** The clipboard was cleared and the rewrite failed: the operator has LOST
	 * their clipboard and has to be told, not just logged at. */
	| { status: "lost" }
	| { status: "failed" };

/** Parse {@link RESTORE_SCRIPT}'s output. Null on anything unrecognised. */
export function parseRestore(output: string): RestoreResult | null {
	const trimmed = output.trim();
	const ok = /^ok (-?\d+)$/.exec(trimmed);
	if (ok) {
		const changeCount = Number(ok[1]);
		return Number.isSafeInteger(changeCount) ? { status: "restored", changeCount } : null;
	}
	if (/^abandoned(\s|$)/.test(trimmed)) return { status: "abandoned" };
	if (trimmed === "fail-after-clear") return { status: "lost" };
	if (trimmed === "empty-stash" || /^fail-/.test(trimmed)) return { status: "failed" };
	return null;
}

/** The subset of the runner this module needs. Same shape as `ClipboardDeps`,
 * so a caller can pass its own deps straight through. */
export type StashDeps = {
	runJxaWithArgs(script: string, args: readonly string[]): Promise<RunResult>;
	/** Structural logging only — fixed tokens and integers. Never any part of
	 * the clipboard. */
	log?(message: string): void;
};

/**
 * Save the clipboard, if there is anything savable there.
 *
 * Never throws and never blocks the gesture: every failure returns
 * `{status: "none"}`, which means the gesture proceeds exactly as it did
 * before restoration existed. Failing to SAVE a clipboard must not cost the
 * operator the paste they actually asked for.
 */
export async function snapshotClipboard(
	deps: StashDeps,
	maxBytes: number = MAX_STASH_BYTES,
): Promise<SnapshotResult> {
	const result = await deps.runJxaWithArgs(SNAPSHOT_SCRIPT, [STASH_PASTEBOARD_NAME, String(maxBytes)]);
	if (!result.ok) {
		deps.log?.(`clipboard-stash: snapshot script failed (code=${result.code})`);
		return { status: "none", reason: "failed" };
	}
	const parsed = parseSnapshot(result.stdout);
	if (!parsed) {
		deps.log?.("clipboard-stash: snapshot returned an unrecognised result; not restoring anything");
		return { status: "none", reason: "failed" };
	}
	if (parsed.status === "none") {
		deps.log?.(`clipboard-stash: nothing saved (${parsed.reason}); this gesture will leave its text on the clipboard`);
	} else {
		deps.log?.(`clipboard-stash: saved ${parsed.items} item(s), ${parsed.bytes} bytes`);
	}
	return parsed;
}

/**
 * Put the clipboard back, then release the stash whatever happened.
 *
 * `expectedChangeCount` is the count our own gesture last produced; the
 * restore is abandoned if the clipboard has moved past it. The release runs
 * in a `finally`, because a stash that outlives its gesture is a copy of the
 * operator's data sitting somewhere they don't know about.
 */
export async function restoreClipboard(
	deps: StashDeps,
	snapshot: SnapshotResult,
	expectedChangeCount: number,
): Promise<RestoreResult> {
	if (snapshot.status === "none") return { status: "failed" };
	try {
		const result = await deps.runJxaWithArgs(RESTORE_SCRIPT, [
			STASH_PASTEBOARD_NAME,
			String(expectedChangeCount),
		]);
		if (!result.ok) {
			deps.log?.(`clipboard-stash: restore script failed (code=${result.code})`);
			await releaseStash(deps);
			return { status: "failed" };
		}
		const parsed = parseRestore(result.stdout);
		if (!parsed) {
			// Unrecognised means we cannot tell whether the clipboard was
			// cleared, so keep the stash: it may be the only copy left.
			deps.log?.("clipboard-stash: restore returned an unrecognised result; keeping the saved copy");
			return { status: "failed" };
		}
		if (parsed.status === "restored") deps.log?.("clipboard-stash: clipboard restored");
		else if (parsed.status === "abandoned")
			deps.log?.("clipboard-stash: not restoring — the clipboard changed during the gesture, so that newer copy wins");
		else if (parsed.status === "lost")
			deps.log?.("clipboard-stash: RESTORE FAILED AFTER CLEARING — keeping the saved copy in the stash");
		else deps.log?.("clipboard-stash: restore failed; the clipboard keeps this gesture's text");
		// DELIBERATELY NOT RELEASED after a post-clear failure: at that moment
		// the stash holds the ONLY surviving copy of the operator's clipboard,
		// and releasing it would turn a recoverable failure into permanent
		// loss. The retention policy is explicit: it stays until the next
		// plugin start releases it (see STASH_PASTEBOARD_NAME), and the
		// operator is alerted rather than only logged at.
		if (parsed.status !== "lost") await releaseStash(deps);
		return parsed;
	} catch (error) {
		await releaseStash(deps);
		throw error;
	}
}

/** Clear and release the stash. Safe to call when there is no stash — that is
 * exactly what plugin startup does, to clean up after a run that was killed
 * mid-gesture. */
export async function releaseStash(deps: StashDeps): Promise<boolean> {
	const result = await deps.runJxaWithArgs(RELEASE_SCRIPT, [STASH_PASTEBOARD_NAME]);
	if (!result.ok) {
		deps.log?.(`clipboard-stash: could not release the stash (code=${result.code})`);
		return false;
	}
	// The script CATCHES its own errors and reports them on stdout, so
	// osascript exits 0 either way. Checking only the exit status would read a
	// failed release as a successful one and leave a copy of the operator's
	// clipboard sitting in the pasteboard server unnoticed.
	if (result.stdout.trim() !== "ok") {
		deps.log?.("clipboard-stash: the stash could not be released; it will be cleaned up at the next plugin start");
		return false;
	}
	return true;
}
