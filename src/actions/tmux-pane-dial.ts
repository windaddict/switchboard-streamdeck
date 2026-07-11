import streamDeck, {
	action,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
	type TouchTapEvent,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { resolveFrontTmux } from "../mac/front-tmux.js";
import { rotationDirection } from "../mac/rotation.js";
import {
	type PaneDialMode,
	paneDialFeedback,
	paneStatusArgs,
	parsePaneStatus,
	selectPaneArgs,
	togglePaneDialMode,
} from "../mac/tmux-pane.js";
import { findTmuxPath, runTmux } from "../mac/tmux-runner.js";
import { selectWindowDirArgs } from "../mac/tmux-window.js";

type TmuxPaneSettings = {
	/** What rotation moves through. Persisted so it survives restarts. */
	mode?: PaneDialMode;
};

/**
 * Dial action: rotate to switch tmux panes — or, after a press/touch-tap
 * toggles the mode, tmux windows. Every command is scoped to the tmux session
 * shown in the FRONTMOST macOS window; when iTerm isn't frontmost the dial
 * does nothing (never a background terminal) and the strip shows a dash. The
 * mode is stored in the button's settings and survives Stream Deck restarts.
 * The touchscreen shows the mode and the current pane command (or window
 * name) of the controlled session.
 */
@action({ UUID: "com.movingavg.switchboard.tmuxpane" })
export class TmuxPaneDial extends SingletonAction<TmuxPaneSettings> {
	override async onWillAppear(ev: WillAppearEvent<TmuxPaneSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refresh(ev.action, ev.payload.settings.mode ?? "panes");
		}
	}

	override async onDialRotate(ev: DialRotateEvent<TmuxPaneSettings>): Promise<void> {
		const mode = ev.payload.settings.mode ?? "panes";
		const direction = rotationDirection(ev.payload.ticks);
		if (direction !== "none") {
			const tmux = findTmuxPath();
			const front = await resolveFrontTmux(tmux);
			if (front === null) {
				await this.refresh(ev.action, mode);
				return; // no tmux in the frontmost window — do nothing
			}
			const args =
				mode === "windows"
					? selectWindowDirArgs(direction, front.session)
					: selectPaneArgs(direction, front.session);
			const result = await runTmux(args, tmux);
			if (!result.ok) {
				streamDeck.logger.error(`tmux ${args[0]} failed: ${result.stderr || "no server?"}`);
			}
		}
		await this.refresh(ev.action, mode);
	}

	/** Press: toggle between switching panes and switching windows. */
	override async onDialDown(ev: DialDownEvent<TmuxPaneSettings>): Promise<void> {
		await this.toggle(ev.action, ev.payload.settings);
	}

	/** Touch-tap: same toggle as press. */
	override async onTouchTap(ev: TouchTapEvent<TmuxPaneSettings>): Promise<void> {
		await this.toggle(ev.action, ev.payload.settings);
	}

	private async toggle(
		dial: DialAction<TmuxPaneSettings>,
		settings: TmuxPaneSettings,
	): Promise<void> {
		const mode = togglePaneDialMode(settings.mode ?? "panes");
		await dial.setSettings({ ...settings, mode });
		await this.refresh(dial, mode);
	}

	/** Repaint from the controlled session's state; a dash when there is none. */
	private async refresh(dial: DialAction<TmuxPaneSettings>, mode: PaneDialMode): Promise<void> {
		const tmux = findTmuxPath();
		const front = await resolveFrontTmux(tmux);
		let status = parsePaneStatus(""); // dash placeholders when nothing to control
		if (front !== null) {
			const result = await runTmux(paneStatusArgs(front.session), tmux);
			if (!result.ok) return;
			status = parsePaneStatus(result.stdout);
		}
		try {
			await dial.setFeedback(paneDialFeedback(mode, status));
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
