import { appendFileSync } from "node:fs"; // TEMP TRACE
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
import { CoalescedRunner, shouldPollThisTick } from "../mac/coalesce.js";
import { FRONT_APP_BUNDLE_JXA } from "../mac/app-windows.js";
import { scanClaudeInstances } from "../mac/claude-scan.js";
import {
	claudeStateForWindow,
	LIST_PANE_TTYS_ARGS,
	parsePaneTtys,
	windowShellBusy,
} from "../mac/claude-state.js";
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
import { invalidateFrontTmux, resolveFrontTmux } from "../mac/front-tmux.js";
import { captureTmuxTarget, currentWindowArgs, parseCurrentWindow } from "../mac/tmux-window.js";

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
	private readonly refresher = new CoalescedRunner(() => this.doRefreshAll());
	private spin = 0; // poll tick counter — rotates the working spark
	private tick = 0; // interval counter for the adaptive idle gate
	/** Last tick saw a frontmost terminal / hot key / working Claude. */
	private interesting = true;
	private readonly lastImage = new Map<string, string>(); // skip identical repaints

	override async onWillAppear(ev: WillAppearEvent<FocusTmuxSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => {
				// Idle gate: when nothing is hot/working and no terminal is
				// frontmost, poll at a quarter cadence — the full subprocess
				// set spent most of its CPU watching nothing change.
				if (shouldPollThisTick(this.tick++, this.interesting)) void this.refreshAll();
			}, POLL_MS);
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
		this.lastImage.delete(ev.action.id);
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
	/** Coalesced: an explicit repaint request colliding with an in-flight poll
	 * tick queues a rerun instead of being dropped — a freshly captured or
	 * raised key must never keep its old face for another poll cycle. */
	private refreshAll(): Promise<void> {
		return this.refresher.request();
	}

	private async doRefreshAll(): Promise<void> {
		if (this.visible.size === 0) return;
		{
			const tmux = findTmuxPath();
			this.spin++;
			const [front, windowsRes, clientsRes, panesRes, instances] = await Promise.all([
				runJxa(FRONT_APP_BUNDLE_JXA),
				runTmux(LIST_WINDOWS_ARGS, tmux),
				runTmux(LIST_CLIENTS_ARGS, tmux),
				runTmux(LIST_PANE_TTYS_ARGS, tmux),
				scanClaudeInstances(),
			]);
			const iTermFrontmost = front.ok && front.stdout.trim() === ITERM_BUNDLE_ID;
			let anyInteresting = iTermFrontmost;
			// Only address iTerm when it is frontmost — AppleScript would LAUNCH it.
			const focusedTty = iTermFrontmost
				? (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim()
				: "";
			const windows = windowsRes.ok ? parseWindows(windowsRes.stdout) : [];
			const clients = parseClients(clientsRes.stdout);
			const panes = panesRes.ok ? parsePaneTtys(panesRes.stdout) : [];
			const busyTtys = new Set(instances.filter((i) => i.shellBusy).map((i) => i.tty));

			for (const key of this.visible.values()) {
				const settings = await key.getSettings();
				const status = evaluateKeyStatus({
					windows,
					clients,
					target: (settings.target ?? "").trim(),
					iTermFrontmost,
					focusedTty,
				});
				let claude =
					status.state === "unknown"
						? "none"
						: claudeStateForWindow(panes, status.session, status.window);
				// "Brewed … · 1 shell still running": the turn ended (title ✳ =
				// waiting) but a backgrounded shell keeps working under claude.
				if (claude === "waiting" && windowShellBusy(panes, status.session, status.window, busyTtys)) {
					claude = "working";
				}
				if (status.state === "hot" || claude === "working") anyInteresting = true;
				if (settings.target === "apps:switchboard") appendFileSync("/tmp/sb-trace.log", `${new Date().toISOString()} state=${status.state} claude=${claude}\n`); // TEMP TRACE
				const image = svgToDataUri(buildTmuxKeyImage(status, claude, this.spin));
				if (this.lastImage.get(key.id) === image) continue; // unchanged — save the round-trip
				try {
					await key.setImage(image);
					this.lastImage.set(key.id, image);
				} catch (err) {
					streamDeck.logger.debug(`tmux key image skipped: ${String(err)}`);
				}
			}
			this.interesting = anyInteresting;
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
			// A hard failure (permission denied, script error) must not paint ✓.
			streamDeck.logger.error(`iTerm raise failed (${raise.code}): ${raise.stderr}`);
			await key.showAlert();
			return;
		}
		if (raise.stdout.includes("notfound")) {
			// Documented fallback: no iTerm session on that tty — iTerm was
			// activated, which is the best available outcome, so still ✓.
			streamDeck.logger.debug(`No iTerm session on tty ${tty ?? "?"}; activated iTerm only.`);
		}

		// Optionally switch tmux to the exact window (default on).
		if (settings.switchWindow !== false) {
			const selected = await runTmux(selectWindowArgs(match), tmux);
			if (!selected.ok) {
				streamDeck.logger.error(`tmux select-window failed: ${selected.stderr || "no server?"}`);
				await key.showAlert();
				return;
			}
		}

		await key.showOk();
		await this.refreshAll(); // the press changed focus — flip the dots now
		// NSWorkspace can still report the OLD frontmost app right after the
		// raise; one short-settle re-refresh corrects the cold-then-fix flicker.
		setTimeout(() => void this.refreshAll(), 450);
	}

	/**
	 * Long press: capture the current tmux window into this button — the window
	 * of the session in the FRONTMOST macOS window (an untargeted query asks
	 * tmux for ITS current window, which can belong to a background terminal —
	 * the same wrong-session trap the dials had).
	 */
	private async capture(key: KeyAction<FocusTmuxSettings>): Promise<void> {
		const tmux = findTmuxPath();
		// Capture is an explicit "what is front RIGHT NOW" — a poll-aged cache
		// entry (up to 2s old) could name the previous session. Probe fresh.
		invalidateFrontTmux();
		const front = await resolveFrontTmux(tmux);
		if (front === null) {
			streamDeck.logger.warn("Focus tmux capture: iTerm/tmux is not the frontmost window.");
			await key.showAlert();
			return;
		}
		const result = await runTmux(currentWindowArgs(front.session), tmux);
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
