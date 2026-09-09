/**
 * WHAT IT'S FOR: decides what the deck and the log should say when a focus
 * press does something other than raise a window. It is pure so those decisions
 * can be tested — the module that performs them talks to the Stream Deck SDK
 * and this repo has no harness for action shells, so any logic left there is
 * verified by reading it.
 *
 * The three events it describes are the three ways a press departs from the
 * golden path, and every one of them used to be invisible: a dropped press
 * returned `undefined` that no caller could tell from success, a taken-over key
 * was reported only if the replacement finished, and a raise that threw was
 * swallowed by the absent error branch.
 */

/** What the action shell should do about one press event. */
export interface FocusReport {
	level: "warn" | "error";
	message: string;
	/** Flash the key, so a press that did nothing does not look like one that worked. */
	alert: boolean;
}

/**
 * A press that never ran because another raise holds the shared key.
 *
 * `warn`, not `error`: two presses inside one raise is ordinary contention, not
 * a fault. It alerts because the alternative — a key that silently ignores you —
 * is the symptom that made the original wedge impossible to notice.
 */
export function describeDroppedPress(label: string, key: string, heldForMs: number): FocusReport {
	return {
		level: "warn",
		message: `${label}: press ignored — another raise has held "${key}" for ${Math.round(heldForMs)}ms.`,
		alert: true,
	};
}

/**
 * A press that took the shared key from a holder stuck past the threshold.
 *
 * `error`, and deliberately loud: reaching this means every focus key on the
 * deck had been dead since that holder stalled. No alert — this press is going
 * on to do its work, so flashing would tell the operator it failed.
 */
export function describeTakeover(label: string, key: string, heldForMs: number): FocusReport {
	return {
		level: "error",
		message:
			`${label}: took "${key}" from a raise stuck for ${Math.round(heldForMs)}ms — an earlier press never completed, ` +
			`so every focus key was dead until this one.`,
		alert: false,
	};
}

/**
 * A press whose raise threw. Named separately because the shell rethrows after
 * reporting: the operator gets the alert, and the error still propagates rather
 * than being swallowed here.
 */
export function describeFailedPress(label: string, error: unknown): FocusReport {
	return {
		level: "error",
		message: `${label}: raise failed — ${error instanceof Error ? error.message : String(error)}`,
		alert: true,
	};
}
