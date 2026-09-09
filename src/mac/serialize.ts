/**
 * Per-key async mutex: chains tasks for the same key so read-modify-write
 * handlers (dial rotations that persist a cursor, run a subprocess, then
 * render) can't interleave. Stream Deck delivers events serially, but async
 * handlers overlap at their await points — two rotations could both read the
 * same settings index and both write index+1. Tasks for DIFFERENT keys run
 * concurrently; a rejected task never breaks the chain.
 *
 * The map is self-cleaning: when a key's chain fully settles it removes its
 * own entry (only if it is still the tail). There is deliberately no external
 * "release" — deleting a live chain would let a new event run concurrently
 * with an in-flight task, recreating the exact race this exists to prevent.
 */

const chains = new Map<string, Promise<unknown>>();

/**
 * The age at which a holder's claim on an exclusive key may be TAKEN by a new
 * request.
 *
 * Read what this is and is not. It is NOT a proof that a legitimate hold
 * finishes sooner: the locked focus path awaits Stream Deck SDK round-trips
 * (`getSettings`, `showOk`) that have no timeout at all, so no finite upper
 * bound on a healthy hold can be derived from that code. It is a chosen
 * recovery policy, and the tradeoff it makes is explicit in both directions:
 * a healthy press slower than this can be taken from (see the overlap note on
 * {@link runExclusive}), and a genuinely wedged key stays dead until this much
 * time has passed AND another press arrives.
 *
 * The number is anchored to what IS bounded: the path's subprocesses cap at
 * roughly 39s (three osascript at 8s, three tmux at 5s) if every one times
 * out, so a value below that would take from a press whose slowness is fully
 * explained by bounded work. 45s clears it with a small margin. A press that
 * exceeds 45s is, by construction, one whose extra time came from something
 * unbounded — which is the condition this exists to recover from.
 */
export const MAX_HOLD_MS = 45_000;

/**
 * What happened to a {@link runExclusive} request.
 *
 * The old signature returned `T | undefined`, which could not tell "dropped"
 * from "ran and returned undefined" — every focus handler returns void, so no
 * caller could detect a dropped press and none reported one. That silence is
 * what made a wedged key invisible: no alert on the deck, nothing in the log.
 */
export type ExclusiveOutcome<T> =
	| { ran: true; value: T; /** Set only when this request took a stuck key. */ stoleAfterMs?: number }
	| { ran: false; heldForMs: number };

export interface ExclusiveOptions {
	/** Elapsed-time source. Defaults to a MONOTONIC clock: `Date.now()` is wall
	 * time, so an NTP correction or a manual clock change would make a hold look
	 * arbitrarily old (premature takeover) or arbitrarily young (a wedge that
	 * outlives the threshold). Injectable so tests can drive it. */
	now?: () => number;
	/** Called at the MOMENT a stuck key is taken, before the new task starts.
	 * The outcome cannot carry this in time: it is only returned once the task
	 * settles, so a replacement that also wedges would never report the takeover
	 * at all — losing exactly the event worth knowing about. */
	onSteal?: (heldForMs: number) => void;
}

/**
 * The live holder of each exclusive key. `token` is the identity, not `at`:
 * two acquisitions can land in the same millisecond, and a displaced holder must
 * never delete the entry belonging to the request that took the key from it.
 * Same rule the `chains` map above follows — only clean up if still yours.
 */
const holders = new Map<string, { token: number; at: number }>();
let holderSeq = 0;

/** Tests only: forget every holder so cases cannot leak into each other. */
export function resetExclusive(): void {
	holders.clear();
}

/**
 * Run at most one task for a key. A second request while the first is live is
 * dropped rather than queued: focus presses describe "go there now", so a stale
 * press must not fire seconds later after a slow cross-Space raise.
 *
 * REQUEST-TRIGGERED LEASE TAKEOVER, which is a weaker thing than a timeout and
 * must not be described as one. There is no timer and no autonomous expiry: a
 * holder that never settles stays recorded indefinitely, and the key only
 * changes hands when a LATER REQUEST arrives finding the claim older than
 * {@link MAX_HOLD_MS}. So the deck does not heal on its own — it heals on the
 * next press after the threshold, and a press before it is still dropped.
 *
 * Why it exists: every subprocess in the focus path is bounded (osascript 8s,
 * tmux 5s), but the SDK round-trips around them are not — `getSettings()` waits
 * for a `didReceiveSettings` reply that a dropped websocket message never
 * delivers. A holder stuck on one of those held the key for the life of the
 * process, and because the key is the literal string "iterm-focus" shared by all
 * five focus actions, one lost reply silently killed every one of them until the
 * plugin was restarted.
 *
 * THE COST, stated at full strength because an earlier draft of this comment
 * called it a brief overlap and that was wrong: taking the key does NOT cancel
 * the displaced task, and nothing bounds how long it may still run. If it later
 * resumes it will carry out its own side effects — raising ITS iTerm window,
 * switching the tmux client to ITS target — after the newer press has already
 * done so. The user-visible result is being pulled to the older destination
 * some time after arriving at the newer one. Nothing here prevents that; the
 * only real defence would be an ownership check immediately before each
 * focus-changing side effect, which this does not implement. The tradeoff taken
 * is that a rare wrong-window raise during recovery beats five permanently dead
 * keys, not that the race was eliminated.
 *
 * The caller is told which happened. This module is pure and cannot log, and a
 * dropped press and a taken key are both departures from the golden path that
 * must leave a trace at the call site.
 */
export async function runExclusive<T>(
	key: string,
	task: () => Promise<T>,
	opts: ExclusiveOptions = {},
): Promise<ExclusiveOutcome<T>> {
	const now = opts.now ?? monotonicNow;
	const held = holders.get(key);
	const at = now();
	let stoleAfterMs: number | undefined;
	if (held !== undefined) {
		const heldForMs = at - held.at;
		// A young claim is a real press in flight: honour it and drop this one.
		if (heldForMs < MAX_HOLD_MS) return { ran: false, heldForMs };
		stoleAfterMs = heldForMs;
		opts.onSteal?.(heldForMs);
	}
	const token = ++holderSeq;
	holders.set(key, { token, at });
	try {
		const value = await task();
		return stoleAfterMs === undefined ? { ran: true, value } : { ran: true, value, stoleAfterMs };
	} finally {
		// Only clean up if the key is still ours: a request that took the key
		// from us owns it now, and releasing it here would let two presses run.
		if (holders.get(key)?.token === token) holders.delete(key);
	}
}

/** Monotonic elapsed-time source — immune to wall-clock adjustment in BOTH
 * directions, which `Date.now()` is not. */
const monotonicNow = (): number => performance.now();

export function serialize<T>(key: string, task: () => Promise<T>): Promise<T> {
	const prev = chains.get(key) ?? Promise.resolve();
	const next = prev.then(task, task);
	let entry: Promise<void>;
	entry = next.then(
		() => {
			if (chains.get(key) === entry) chains.delete(key);
		},
		() => {
			if (chains.get(key) === entry) chains.delete(key);
		},
	);
	chains.set(key, entry);
	return next;
}
