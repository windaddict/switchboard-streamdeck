import streamDeck, {
	action,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
} from "@elgato/streamdeck";

import {
	CANCEL_MODE_ARGS,
	PANE_IN_MODE_ARGS,
	paneDirection,
	paneIsInMode,
	selectPaneArgs,
} from "../mac/tmux-pane.js";
import { findTmuxPath, runTmux } from "../mac/tmux-runner.js";

type TmuxPaneSettings = {
	/** Reserved for a future per-button session scope. */
	session?: string;
};

/**
 * Dial action: rotate to switch tmux panes (next/previous), push to exit
 * copy-mode so the cursor returns to the live prompt when the pane is scrolled
 * up. Operates on tmux's current pane (no per-button config needed).
 */
@action({ UUID: "com.movingavg.switchboard.tmuxpane" })
export class TmuxPaneDial extends SingletonAction<TmuxPaneSettings> {
	override async onDialRotate(ev: DialRotateEvent<TmuxPaneSettings>): Promise<void> {
		const direction = paneDirection(ev.payload.ticks);
		if (direction === "none") return;

		const result = await runTmux(selectPaneArgs(direction), findTmuxPath());
		if (!result.ok) {
			streamDeck.logger.error(`tmux select-pane failed: ${result.stderr || "no server?"}`);
		}
	}

	override async onDialDown(_ev: DialDownEvent<TmuxPaneSettings>): Promise<void> {
		const tmux = findTmuxPath();
		const mode = await runTmux(PANE_IN_MODE_ARGS, tmux);
		// Only cancel when actually scrolled up — send-keys -X errors outside a mode.
		if (paneIsInMode(mode.stdout)) {
			await runTmux(CANCEL_MODE_ARGS, tmux);
		}
	}
}
