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

import { type FrontTmux, resolveFrontTmux } from "../mac/front-tmux.js";
import { rotationSteps } from "../mac/rotation.js";
import { serialize } from "../mac/serialize.js";
import { parseWindows } from "../mac/tmux.js";
import { findTmuxPath, LIST_WINDOWS_ARGS, runTmux } from "../mac/tmux-runner.js";
import {
	buildAllWindowsFeedback,
	buildWindowFeedback,
	currentWindowArgs,
	lastSessionArgs,
	lastWindowArgs,
	nextWindowAcross,
	parseActiveFlags,
	parseCurrentWindow,
	selectWindowDirArgs,
	switchToWindowArgs,
	type TmuxScope,
	toggleScope,
	windowFlagsArgs,
} from "../mac/tmux-window.js";

type TmuxWindowDialSettings = {
	/** Reserved for a future per-button session scope. */
	session?: string;
};

/**
 * Dial action: rotate to cycle tmux windows, push for last-window. Touch-tap
 * toggles the scope between the current session and ALL sessions: in "all"
 * scope rotation crosses session boundaries (switch-client) and push jumps to
 * the last session. Every command drives the tmux client/session in the
 * FRONTMOST macOS window; when iTerm isn't frontmost the dial does nothing
 * (never a background terminal) and the strip shows a dash. The touchscreen
 * shows a session-tinted background with position dots (plus an ALL badge in
 * all-sessions scope), refreshed after every change. The scope is transient
 * per-dial memory.
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
		const { direction, steps } = rotationSteps(ev.payload.ticks);
		if (direction !== "none") {
			// Serialized per dial, consuming the full tick count (see pane dial).
			await serialize(ev.action.id, async () => {
				const tmux = findTmuxPath();
				const front = await resolveFrontTmux(tmux);
				if (front === null) return; // no tmux in the frontmost window
				for (let i = 0; i < steps; i++) {
					if (this.scope(ev.action.id) === "all") {
						const [list, current] = await Promise.all([
							runTmux(LIST_WINDOWS_ARGS, tmux),
							runTmux(currentWindowArgs(front.session), tmux),
						]);
						const target = list.ok
							? nextWindowAcross(parseWindows(list.stdout), parseCurrentWindow(current.stdout), direction)
							: null;
						if (target === null) return;
						const result = await runTmux(switchToWindowArgs(target, front.tty), tmux);
						if (!result.ok) {
							streamDeck.logger.error(`tmux switch-client failed: ${result.stderr || "no server?"}`);
							return;
						}
					} else {
						const result = await runTmux(selectWindowDirArgs(direction, front.session), tmux);
						if (!result.ok) {
							streamDeck.logger.error(`tmux ${direction}-window failed: ${result.stderr || "no server?"}`);
							return;
						}
					}
				}
			});
		}
		await this.refresh(ev.action);
	}

	/** Push: last window in session scope, last session in all scope. */
	override async onDialDown(ev: DialDownEvent<TmuxWindowDialSettings>): Promise<void> {
		const tmux = findTmuxPath();
		const front = await resolveFrontTmux(tmux);
		if (front !== null) {
			const args =
				this.scope(ev.action.id) === "all" ? lastSessionArgs(front.tty) : lastWindowArgs(front.session);
			await runTmux(args, tmux);
		}
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

	/** Repaint from the front session's state; a dash when there is none. */
	private async refresh(dial: DialAction<TmuxWindowDialSettings>): Promise<void> {
		const tmux = findTmuxPath();
		const front = await resolveFrontTmux(tmux);
		const all = this.scope(dial.id) === "all";

		let feedback;
		if (front === null) {
			feedback = buildWindowFeedback({ session: "", name: "—", index: 0 }, []);
		} else {
			const [current, set] = await Promise.all([
				runTmux(currentWindowArgs(front.session), tmux),
				runTmux(all ? LIST_WINDOWS_ARGS : windowFlagsArgs(front.session), tmux),
			]);
			// Keep the last good strip rather than painting a half-true one
			// (e.g. dots missing) from a failed query.
			if (!current.ok || !set.ok) return;
			const parsed = parseCurrentWindow(current.stdout);
			feedback = all
				? buildAllWindowsFeedback(parseWindows(set.stdout), parsed)
				: buildWindowFeedback(parsed, parseActiveFlags(set.stdout));
		}
		try {
			await dial.setFeedback(feedback);
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
