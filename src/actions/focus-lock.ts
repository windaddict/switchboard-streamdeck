/**
 * WHAT IT'S FOR: the single place the five focus actions (AI Project, the three
 * superseded per-agent keys, and Focus tmux Window) take the shared raise key,
 * so a press that does not raise a window says so — on the deck and in the log —
 * instead of vanishing.
 *
 * Why it exists: the key is one literal string shared by all five actions, and
 * `runExclusive` used to return `T | undefined`. Every focus handler returns
 * void, so a dropped press was indistinguishable from a successful one; no
 * caller alerted and no caller logged. When a holder wedged, all five keys went
 * dead in silence and the only cure was restarting the plugin.
 *
 * A thin shell by design: what to say is decided by the pure, tested
 * {@link FocusReport} builders in `mac/focus-outcome.ts`; this only performs it.
 */

import streamDeck, { type KeyAction } from "@elgato/streamdeck";

import {
	describeDroppedPress,
	describeFailedPress,
	describeTakeover,
	type FocusReport,
} from "../mac/focus-outcome.js";
import { runExclusive } from "../mac/serialize.js";

/** The one key every raise serialises on — raising two iTerm windows at once
 * would fight over which ends up frontmost. */
export const FOCUS_KEY = "iterm-focus";

async function perform(report: FocusReport, key: Pick<KeyAction, "showAlert">): Promise<void> {
	if (report.level === "warn") streamDeck.logger.warn(report.message);
	else streamDeck.logger.error(report.message);
	if (!report.alert) return;
	// Deck feedback is cosmetic; failing to flash must not replace the real
	// error with a second one, so it is reported and swallowed here.
	try {
		await key.showAlert();
	} catch (err) {
		streamDeck.logger.warn(`Focus press: showAlert failed: ${String(err)}`);
	}
}

/**
 * Run one action's raise under {@link FOCUS_KEY}, reporting every way it can
 * fail to happen. `label` names the action in the log — there are five, and
 * knowing which one wedged is the point of logging it.
 *
 * A raise that THROWS is reported and then rethrown, not swallowed: the caller's
 * error handling is unchanged by this wrapper, it merely stops being silent.
 */
export async function runFocusPress(
	label: string,
	key: Pick<KeyAction, "showAlert">,
	task: () => Promise<void>,
): Promise<void> {
	let outcome: Awaited<ReturnType<typeof runExclusive<void>>>;
	try {
		outcome = await runExclusive(FOCUS_KEY, task, {
			// Reported at the moment of takeover, not after: a replacement that
			// also wedges would otherwise never report it at all.
			onSteal: (heldForMs) => {
				const report = describeTakeover(label, FOCUS_KEY, heldForMs);
				streamDeck.logger.error(report.message);
			},
		});
	} catch (err) {
		await perform(describeFailedPress(label, err), key);
		throw err;
	}
	if (!outcome.ran) await perform(describeDroppedPress(label, FOCUS_KEY, outcome.heldForMs), key);
}
