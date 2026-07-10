import streamDeck, {
	action,
	type JsonValue,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	type SendToPluginEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { runAppleScript, runJxa } from "../applescript/runner.js";
import { FRONT_APP_BUNDLE_JXA } from "../mac/app-windows.js";
import { buildITermRaiseScript, ITERM_BUNDLE_ID, ITERM_FOCUSED_TTY_SCRIPT } from "../mac/iterm.js";
import { PressGate } from "../mac/press-gate.js";
import { svgToDataUri } from "../mac/svg.js";
import {
	parseClients,
	parseWindows,
	resolveTarget,
	selectWindowArgs,
	tmuxWindowLabel,
	tmuxWindowValue,
} from "../mac/tmux.js";
import { buildTmuxKeyImage, evaluateKeyStatus } from "../mac/tmux-key.js";
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

/** How often the key faces re-check the live focus state. */
const POLL_MS = 2500;

/**
 * Raise the iTerm2 window hosting a tmux session (matched by one of its window
 * names) and optionally switch tmux to that window. The dropdown is populated
 * live from `tmux list-windows`; the target is re-resolved at press time so it
 * survives tmux layout changes. Holding the key ("teach the button") captures
 * the current tmux window as the new target. The key face renders live: a
 * mini tmux pane whose status bar lights up (with a block cursor) when this
 * window would receive keyboard input right now.
 */
@action({ UUID: "com.movingavg.switchboard.tmux" })
export class FocusTmuxWindow extends SingletonAction<FocusTmuxSettings> {
	private readonly gate = new PressGate();
	private readonly visible = new Map<string, KeyAction<FocusTmuxSettings>>();
	private timer?: ReturnType<typeof setInterval>;
	private refreshing = false;

	override async onWillAppear(ev: WillAppearEvent<FocusTmuxSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => void this.refreshAll(), POLL_MS);
		}
		await this.refreshAll();
	}

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
		this.visible.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	/**
	 * One query set per tick, evaluated for every visible key: frontmost app
	 * (fast NSWorkspace JXA, doubles as the gate — when iTerm isn't frontmost
	 * nothing is hot and the iTerm query is skipped), tmux windows + clients,
	 * and iTerm's focused-session tty.
	 */
	private async refreshAll(): Promise<void> {
		if (this.refreshing || this.visible.size === 0) return;
		this.refreshing = true;
		try {
			const tmux = findTmuxPath();
			const [front, windowsRes, clientsRes] = await Promise.all([
				runJxa(FRONT_APP_BUNDLE_JXA),
				runTmux(LIST_WINDOWS_ARGS, tmux),
				runTmux(LIST_CLIENTS_ARGS, tmux),
			]);
			const iTermFrontmost = front.ok && front.stdout.trim() === ITERM_BUNDLE_ID;
			// Only address iTerm when it is frontmost — AppleScript would LAUNCH it.
			const focusedTty = iTermFrontmost
				? (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim()
				: "";
			const windows = windowsRes.ok ? parseWindows(windowsRes.stdout) : [];
			const clients = parseClients(clientsRes.stdout);

			for (const key of this.visible.values()) {
				const settings = await key.getSettings();
				const status = evaluateKeyStatus({
					windows,
					clients,
					target: (settings.target ?? "").trim(),
					iTermFrontmost,
					focusedTty,
				});
				try {
					await key.setImage(svgToDataUri(buildTmuxKeyImage(status)));
				} catch (err) {
					streamDeck.logger.debug(`tmux key image skipped: ${String(err)}`);
				}
			}
		} finally {
			this.refreshing = false;
		}
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
		await this.refreshAll(); // the press changed focus — flip the dots now
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
		await this.refreshAll(); // repaint with the newly captured target
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
