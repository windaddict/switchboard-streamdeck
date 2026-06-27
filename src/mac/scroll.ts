/**
 * Pure logic for the "scroll the frontmost window" Stream Deck dial.
 *
 * This module models a dial rotation as a {@link KeystrokePlan} and renders
 * that plan into an AppleScript string that drives macOS System Events. It is
 * intentionally free of any Stream Deck SDK dependency so it can be unit
 * tested in isolation.
 *
 * macOS virtual key codes used here:
 *   116 = Page Up, 121 = Page Down, 125 = Down arrow, 126 = Up arrow.
 */

/** Dial scroll speed. "slow" moves line-by-line; "fast" moves page-by-page. */
export type Speed = "slow" | "fast";

/** Persisted settings for the scroll dial action. */
export type ScrollSettings = {
	/** What a dial *press* (not rotation) does. */
	pressAction?: "jumpTop" | "toggleSpeed";
	/** Current scroll speed. */
	speed?: Speed;
	/** Lines emitted per dial tick in "slow" mode. */
	linesPerTick?: number | string;
};

/** A concrete plan for sending a macOS key code N times with modifiers. */
export interface KeystrokePlan {
	/** macOS virtual key code to send. */
	keyCode: number;
	/** How many times to send the key (0 = no-op). */
	repeats: number;
	/** AppleScript modifier phrases, e.g. `[]` or `["command down"]`. */
	modifiers: string[];
}

/**
 * Coerce an arbitrary settings value into a usable lines-per-tick count.
 *
 * Rules: parse numbers and numeric strings, floor to an integer, and clamp to
 * a minimum of 1. Anything unparseable (including `undefined`) falls back to
 * the default of 3.
 *
 * Examples: `"5" -> 5`, `undefined -> 3`, `0 -> 1`, `-2 -> 1`, `2.9 -> 2`,
 * `"abc" -> 3`.
 */
export function normalizeLinesPerTick(value: unknown): number {
	const n =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number(value)
				: NaN;
	if (!Number.isFinite(n)) return 3;
	return Math.max(1, Math.floor(n));
}

/** Toggle between the two speeds. */
export function nextSpeed(s: Speed): Speed {
	return s === "fast" ? "slow" : "fast";
}

/** In "fast" mode each tick scrolls this many times the slow-mode line count. */
export const FAST_MULTIPLIER = 5;

/**
 * Map a dial rotation to a signed scroll distance in lines, posted as a single
 * proportional scroll-wheel event by the native helper (not synthetic
 * keystrokes — those coalesce and never scale).
 *
 * Positive ticks scroll DOWN; negative ticks scroll UP. Ticks are truncated
 * toward zero. In "slow" mode a tick is `linesPerTick` lines; in "fast" mode it
 * is `linesPerTick * FAST_MULTIPLIER`. `linesPerTick` defaults to 3. A zero
 * rotation returns 0 (a no-op).
 */
export function scrollLines(ticks: number, speed: Speed, linesPerTick: number = 3): number {
	const truncated = Math.trunc(ticks);
	const perTick = speed === "fast" ? linesPerTick * FAST_MULTIPLIER : linesPerTick;
	return truncated * perTick;
}

/**
 * Plan a "jump to top of document" action: Cmd+Up (key code 126 with the
 * command modifier), sent once.
 */
export function jumpTopPlan(): KeystrokePlan {
	return {
		keyCode: 126,
		repeats: 1,
		modifiers: ["command down"],
	};
}

/**
 * Seconds to pause between consecutive synthetic key presses. macOS coalesces
 * (drops) System Events key codes fired back-to-back with no gap, which made
 * `linesPerTick` appear to have no effect — 6 presses scrolled the same as 1.
 * A small delay lets each press register so the count actually scales.
 */
const KEYSTROKE_DELAY_SECONDS = 0.02;

/**
 * Render a {@link KeystrokePlan} into an AppleScript that sends its key code
 * `repeats` times via System Events, pausing briefly between presses so they
 * are not coalesced.
 *
 * If `repeats <= 0`, returns a no-op script containing no `key code` line.
 * Otherwise emits a `repeat` loop. The `using {...}` clause is included only
 * when the plan has at least one modifier.
 */
export function buildKeystrokeScript(plan: KeystrokePlan): string {
	if (plan.repeats <= 0) {
		return 'return "noop"';
	}

	const using =
		plan.modifiers.length > 0
			? ` using {${plan.modifiers.join(", ")}}`
			: "";

	return [
		'tell application "System Events"',
		`\trepeat ${plan.repeats} times`,
		`\t\tkey code ${plan.keyCode}${using}`,
		`\t\tdelay ${KEYSTROKE_DELAY_SECONDS}`,
		"\tend repeat",
		"end tell",
		'return "ok"',
	].join("\n");
}
