import streamDeck, {
	action,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { findTmuxPath, runTmux } from "../mac/tmux-runner.js";
import {
	buildWindowFeedback,
	CURRENT_WINDOW_ARGS,
	LAST_WINDOW_ARGS,
	parseActiveFlags,
	parseCurrentWindow,
	selectWindowDirArgs,
	WINDOW_FLAGS_ARGS,
	windowDirection,
} from "../mac/tmux-window.js";

type TmuxWindowDialSettings = {
	/** Reserved for a future per-button session scope. */
	session?: string;
};

/**
 * Dial action: rotate to cycle tmux windows, push for last-window. The
 * touchscreen shows a session-tinted background with position dots plus the
 * current session and window name, refreshed after every change.
 */
@action({ UUID: "com.johnknox.safarijump.tmuxwindial" })
export class CycleTmuxWindow extends SingletonAction<TmuxWindowDialSettings> {
	override async onWillAppear(ev: WillAppearEvent<TmuxWindowDialSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refresh(ev.action);
		}
	}

	override async onDialRotate(ev: DialRotateEvent<TmuxWindowDialSettings>): Promise<void> {
		const direction = windowDirection(ev.payload.ticks);
		if (direction !== "none") {
			const result = await runTmux(selectWindowDirArgs(direction), findTmuxPath());
			if (!result.ok) {
				streamDeck.logger.error(`tmux ${direction}-window failed: ${result.stderr || "no server?"}`);
			}
		}
		await this.refresh(ev.action);
	}

	override async onDialDown(ev: DialDownEvent<TmuxWindowDialSettings>): Promise<void> {
		await runTmux(LAST_WINDOW_ARGS, findTmuxPath());
		await this.refresh(ev.action);
	}

	/** Query the current window + flags and repaint the touchscreen. */
	private async refresh(dial: DialAction<TmuxWindowDialSettings>): Promise<void> {
		const tmux = findTmuxPath();
		const [current, flags] = await Promise.all([
			runTmux(CURRENT_WINDOW_ARGS, tmux),
			runTmux(WINDOW_FLAGS_ARGS, tmux),
		]);
		if (!current.ok) return;

		const feedback = buildWindowFeedback(
			parseCurrentWindow(current.stdout),
			parseActiveFlags(flags.stdout),
		);
		try {
			await dial.setFeedback(feedback);
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
