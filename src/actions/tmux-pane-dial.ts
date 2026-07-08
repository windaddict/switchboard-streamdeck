import streamDeck, {
	action,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
	type TouchTapEvent,
} from "@elgato/streamdeck";

import {
	CANCEL_MODE_ARGS,
	PANE_IN_MODE_ARGS,
	paneIsInMode,
	selectPaneArgs,
	ZOOM_PANE_ARGS,
} from "../mac/tmux-pane.js";
import { rotationDirection } from "../mac/rotation.js";
import { findTmuxPath, runTmux } from "../mac/tmux-runner.js";

type TmuxPaneSettings = {
	/** Reserved for a future per-button session scope. */
	session?: string;
};

/**
 * Dial action: rotate to switch tmux panes (next/previous), push to exit
 * copy-mode so the cursor returns to the live prompt when the pane is scrolled
 * up, touch-tap to toggle pane zoom. Operates on tmux's current pane (no
 * per-button config needed).
 */
@action({ UUID: "com.movingavg.switchboard.tmuxpane" })
export class TmuxPaneDial extends SingletonAction<TmuxPaneSettings> {
	override async onDialRotate(ev: DialRotateEvent<TmuxPaneSettings>): Promise<void> {
		const direction = rotationDirection(ev.payload.ticks);
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

	/** Touch-tap: zoom/unzoom the current pane. */
	override async onTouchTap(_ev: TouchTapEvent<TmuxPaneSettings>): Promise<void> {
		const result = await runTmux(ZOOM_PANE_ARGS, findTmuxPath());
		if (!result.ok) {
			streamDeck.logger.error(`tmux resize-pane -Z failed: ${result.stderr || "no server?"}`);
		}
	}
}
