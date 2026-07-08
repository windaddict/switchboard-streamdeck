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
import { parseWindows } from "../mac/tmux.js";
import { findTmuxPath, LIST_WINDOWS_ARGS, runTmux } from "../mac/tmux-runner.js";
import {
	buildAllWindowsFeedback,
	buildWindowFeedback,
	CURRENT_WINDOW_ARGS,
	LAST_SESSION_ARGS,
	LAST_WINDOW_ARGS,
	nextWindowAcross,
	parseActiveFlags,
	parseCurrentWindow,
	selectWindowDirArgs,
	switchToWindowArgs,
	type TmuxScope,
	toggleScope,
	WINDOW_FLAGS_ARGS,
} from "../mac/tmux-window.js";

type TmuxWindowDialSettings = {
	/** Reserved for a future per-button session scope. */
	session?: string;
};

/**
 * Dial action: rotate to cycle tmux windows, push for last-window. Touch-tap
 * toggles the scope between the current session and ALL sessions: in "all"
 * scope rotation crosses session boundaries (switch-client) and push jumps to
 * the last session. The touchscreen shows a session-tinted background with
 * position dots (plus an ALL badge in all-sessions scope), refreshed after
 * every change. The scope is transient per-dial memory.
 */
@action({ UUID: "com.movingavg.switchboard.tmuxwindial" })
export class CycleTmuxWindow extends SingletonAction<TmuxWindowDialSettings> {
	private readonly scopes = new Map<string, TmuxScope>();

	override async onWillAppear(ev: WillAppearEvent<TmuxWindowDialSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refresh(ev.action);
		}
	}

	override onWillDisappear(ev: WillDisappearEvent<TmuxWindowDialSettings>): void {
		this.scopes.delete(ev.action.id);
	}

	override async onDialRotate(ev: DialRotateEvent<TmuxWindowDialSettings>): Promise<void> {
		const direction = rotationDirection(ev.payload.ticks);
		if (direction !== "none") {
			const tmux = findTmuxPath();
			if (this.scope(ev.action.id) === "all") {
				const [list, current] = await Promise.all([
					runTmux(LIST_WINDOWS_ARGS, tmux),
					runTmux(CURRENT_WINDOW_ARGS, tmux),
				]);
				const target = list.ok
					? nextWindowAcross(parseWindows(list.stdout), parseCurrentWindow(current.stdout), direction)
					: null;
				if (target !== null) {
					const result = await runTmux(switchToWindowArgs(target), tmux);
					if (!result.ok) {
						streamDeck.logger.error(`tmux switch-client failed: ${result.stderr || "no server?"}`);
					}
				}
			} else {
				const result = await runTmux(selectWindowDirArgs(direction), tmux);
				if (!result.ok) {
					streamDeck.logger.error(`tmux ${direction}-window failed: ${result.stderr || "no server?"}`);
				}
			}
		}
		await this.refresh(ev.action);
	}

	/** Push: last window in session scope, last session in all scope. */
	override async onDialDown(ev: DialDownEvent<TmuxWindowDialSettings>): Promise<void> {
		const args = this.scope(ev.action.id) === "all" ? LAST_SESSION_ARGS : LAST_WINDOW_ARGS;
		await runTmux(args, findTmuxPath());
		await this.refresh(ev.action);
	}

	/** Touch-tap: toggle between current-session and all-sessions scope. */
	override async onTouchTap(ev: TouchTapEvent<TmuxWindowDialSettings>): Promise<void> {
		this.scopes.set(ev.action.id, toggleScope(this.scope(ev.action.id)));
		await this.refresh(ev.action);
	}

	private scope(id: string): TmuxScope {
		return this.scopes.get(id) ?? "session";
	}

	/** Query the current window + scope-appropriate set and repaint the touchscreen. */
	private async refresh(dial: DialAction<TmuxWindowDialSettings>): Promise<void> {
		const tmux = findTmuxPath();
		const all = this.scope(dial.id) === "all";
		const [current, set] = await Promise.all([
			runTmux(CURRENT_WINDOW_ARGS, tmux),
			runTmux(all ? LIST_WINDOWS_ARGS : WINDOW_FLAGS_ARGS, tmux),
		]);
		if (!current.ok) return;

		const parsed = parseCurrentWindow(current.stdout);
		const feedback = all
			? buildAllWindowsFeedback(parseWindows(set.stdout), parsed)
			: buildWindowFeedback(parsed, parseActiveFlags(set.stdout));
		try {
			await dial.setFeedback(feedback);
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
