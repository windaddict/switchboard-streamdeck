import streamDeck, {
	action,
	type JsonValue,
	type KeyDownEvent,
	type SendToPluginEvent,
	SingletonAction,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import { buildITermRaiseScript } from "../mac/iterm.js";
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
 * survives tmux layout changes.
 */
@action({ UUID: "com.movingavg.switchboard.tmux" })
export class FocusTmuxWindow extends SingletonAction<FocusTmuxSettings> {
	override async onKeyDown(ev: KeyDownEvent<FocusTmuxSettings>): Promise<void> {
		const target = (ev.payload.settings.target ?? "").trim();
		if (!target) {
			streamDeck.logger.warn("Focus tmux Window pressed with no target selected.");
			await ev.action.showAlert();
			return;
		}

		const tmux = findTmuxPath();
		const windowsResult = await runTmux(LIST_WINDOWS_ARGS, tmux);
		if (!windowsResult.ok) {
			streamDeck.logger.error(`tmux list-windows failed: ${windowsResult.stderr || "no server?"}`);
			await ev.action.showAlert();
			return;
		}

		const match = resolveTarget(parseWindows(windowsResult.stdout), target);
		if (!match) {
			streamDeck.logger.warn(`No tmux window matched "${target}".`);
			await ev.action.showAlert();
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
		if (ev.payload.settings.switchWindow !== false) {
			await runTmux(selectWindowArgs(match), tmux);
		}

		await ev.action.showOk();
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
