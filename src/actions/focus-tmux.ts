import streamDeck, {
	action,
	type JsonValue,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	type SendToPluginEvent,
	SingletonAction,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import { buildITermRaiseScript } from "../mac/iterm.js";
import { PressGate } from "../mac/press-gate.js";
import {
	parseClients,
	parseWindows,
	resolveTarget,
	selectWindowArgs,
	tmuxWindowLabel,
	tmuxWindowValue,
} from "../mac/tmux.js";
import {
	findTmuxPath,
	LIST_CLIENTS_ARGS,
	LIST_WINDOWS_ARGS,
	runTmux,
} from "../mac/tmux-runner.js";
import { captureTmuxTarget, CURRENT_WINDOW_ARGS, parseCurrentWindow } from "../mac/tmux-window.js";

type FocusTmuxSettings = {
	/** Target window as "session:name" (from the dropdown) or a bare name. */
	target?: string;
	/** Also run `tmux select-window` to switch to it. Defaults to true. */
	switchWindow?: boolean;
};

/**
 * Raise the iTerm2 window hosting a tmux session (matched by one of its window
 * names) and optionally switch tmux to that window. The dropdown is populated
 * live from `tmux list-windows`; the target is re-resolved at press time so it
 * survives tmux layout changes. Holding the key ("teach the button") captures
 * the current tmux window as the new target.
 */
@action({ UUID: "com.movingavg.switchboard.tmux" })
export class FocusTmuxWindow extends SingletonAction<FocusTmuxSettings> {
	private readonly gate = new PressGate();

	override onKeyDown(ev: KeyDownEvent<FocusTmuxSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((err) =>
				streamDeck.logger.error(`Focus tmux capture failed: ${String(err)}`),
			);
		});
	}

	override async onKeyUp(ev: KeyUpEvent<FocusTmuxSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return; // long press already captured
		await this.focus(ev.action);
	}

	override onWillDisappear(ev: WillDisappearEvent<FocusTmuxSettings>): void {
		this.gate.cancel(ev.action.id);
	}

	/** Short press: raise the iTerm2 window for the configured tmux window. */
	private async focus(key: KeyAction<FocusTmuxSettings>): Promise<void> {
		const settings = (await key.getSettings()) ?? {};
		const target = (settings.target ?? "").trim();
		if (!target) {
			streamDeck.logger.warn("Focus tmux Window pressed with no target selected.");
			await key.showAlert();
			return;
		}

		const tmux = findTmuxPath();
		const windowsResult = await runTmux(LIST_WINDOWS_ARGS, tmux);
		if (!windowsResult.ok) {
			streamDeck.logger.error(`tmux list-windows failed: ${windowsResult.stderr || "no server?"}`);
			await key.showAlert();
			return;
		}

		const match = resolveTarget(parseWindows(windowsResult.stdout), target);
		if (!match) {
			streamDeck.logger.warn(`No tmux window matched "${target}".`);
			await key.showAlert();
			return;
		}

		// Map the session to the iTerm2 window via its attached client tty.
		const clientsResult = await runTmux(LIST_CLIENTS_ARGS, tmux);
		const tty = parseClients(clientsResult.stdout).get(match.session);

		const raiseScript = tty ? buildITermRaiseScript(tty) : 'tell application "iTerm" to activate';
		const raise = await runAppleScript(raiseScript);
		if (!raise.ok) {
			streamDeck.logger.error(`iTerm raise failed (${raise.code}): ${raise.stderr}`);
		} else if (raise.stdout.includes("notfound")) {
			streamDeck.logger.debug(`No iTerm session on tty ${tty ?? "?"}; activated iTerm only.`);
		}

		// Optionally switch tmux to the exact window (default on).
		if (settings.switchWindow !== false) {
			await runTmux(selectWindowArgs(match), tmux);
		}

		await key.showOk();
	}

	/** Long press: capture the current tmux window into this button. */
	private async capture(key: KeyAction<FocusTmuxSettings>): Promise<void> {
		const result = await runTmux(CURRENT_WINDOW_ARGS, findTmuxPath());
		const target = result.ok ? captureTmuxTarget(parseCurrentWindow(result.stdout)) : "";
		if (target === "") {
			streamDeck.logger.warn(`Focus tmux capture: no current window (${result.stderr || "no server?"}).`);
			await key.showAlert();
			return;
		}
		const settings = (await key.getSettings()) ?? {};
		await key.setSettings({ ...settings, target });
		streamDeck.logger.info(`Focus tmux captured ${target}.`);
		await key.showOk();
	}

	/** Serve the live list of tmux windows to the property inspector dropdown. */
	override async onSendToPlugin(
		ev: SendToPluginEvent<JsonValue, FocusTmuxSettings>,
	): Promise<void> {
		const payload = ev.payload as { event?: string } | undefined;
		if (payload?.event !== "getTmuxWindows") return;

		const tmux = findTmuxPath();
		const result = await runTmux(LIST_WINDOWS_ARGS, tmux);
		const items = parseWindows(result.stdout).map((w) => ({
			label: tmuxWindowLabel(w),
			value: tmuxWindowValue(w),
		}));

		await streamDeck.ui.current?.sendToPropertyInspector({ event: "getTmuxWindows", items });
	}
}
