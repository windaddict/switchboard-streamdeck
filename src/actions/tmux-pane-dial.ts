import streamDeck, {
	action,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
	type TouchTapEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { rotationDirection } from "../mac/rotation.js";
import {
	type PaneDialMode,
	paneDialFeedback,
	PANE_STATUS_ARGS,
	parsePaneStatus,
	selectPaneArgs,
	togglePaneDialMode,
} from "../mac/tmux-pane.js";
import { findTmuxPath, runTmux } from "../mac/tmux-runner.js";
import { selectWindowDirArgs } from "../mac/tmux-window.js";

type TmuxPaneSettings = {
	/** Reserved for a future per-button session scope. */
	session?: string;
};

/**
 * Dial action: rotate to switch tmux panes — or, after a press/touch-tap
 * toggles the mode, tmux windows — from one dial. Operates on tmux's current
 * pane/window (no per-button config needed). The touchscreen shows the mode
 * and the current pane command (or window name). The mode is transient
 * per-dial memory, so every appearance starts in panes mode.
 */
@action({ UUID: "com.movingavg.switchboard.tmuxpane" })
export class TmuxPaneDial extends SingletonAction<TmuxPaneSettings> {
	private readonly modes = new Map<string, PaneDialMode>();

	override async onWillAppear(ev: WillAppearEvent<TmuxPaneSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refresh(ev.action);
		}
	}

	override onWillDisappear(ev: WillDisappearEvent<TmuxPaneSettings>): void {
		this.modes.delete(ev.action.id);
	}

	override async onDialRotate(ev: DialRotateEvent<TmuxPaneSettings>): Promise<void> {
		const direction = rotationDirection(ev.payload.ticks);
		if (direction !== "none") {
			const args =
				this.mode(ev.action.id) === "windows"
					? selectWindowDirArgs(direction)
					: selectPaneArgs(direction);
			const result = await runTmux(args, findTmuxPath());
			if (!result.ok) {
				streamDeck.logger.error(`tmux ${args[0]} failed: ${result.stderr || "no server?"}`);
			}
		}
		await this.refresh(ev.action);
	}

	/** Press: toggle between switching panes and switching windows. */
	override async onDialDown(ev: DialDownEvent<TmuxPaneSettings>): Promise<void> {
		await this.toggle(ev.action);
	}

	/** Touch-tap: same toggle as press. */
	override async onTouchTap(ev: TouchTapEvent<TmuxPaneSettings>): Promise<void> {
		await this.toggle(ev.action);
	}

	private mode(id: string): PaneDialMode {
		return this.modes.get(id) ?? "panes";
	}

	private async toggle(dial: DialAction<TmuxPaneSettings>): Promise<void> {
		this.modes.set(dial.id, togglePaneDialMode(this.mode(dial.id)));
		await this.refresh(dial);
	}

	/** Query the current pane/window and repaint the touchscreen. */
	private async refresh(dial: DialAction<TmuxPaneSettings>): Promise<void> {
		const result = await runTmux(PANE_STATUS_ARGS, findTmuxPath());
		if (!result.ok) return;
		try {
			await dial.setFeedback(paneDialFeedback(this.mode(dial.id), parsePaneStatus(result.stdout)));
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
