import { execFile } from "node:child_process";

import streamDeck, {
	action,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import { FRONT_WINDOW_SCRIPT, parseFrontWindow } from "../mac/app-windows.js";
import { buildAppScript, resolveApp } from "../mac/apps.js";
import { svgToDataUri } from "../mac/key-image.js";
import {
	buildRingImage,
	indexOfWindow,
	nextIndex,
	type RingWindow,
	toggleWindow,
} from "../mac/window-ring.js";

type WindowRingSettings = {
	windows?: RingWindow[];
	cursor?: number;
	/** Play a sound when a long-press registers. Optional; defaults off. */
	sound?: boolean;
};

/** Press held this long (ms) registers as a long press (add/remove). */
const LONG_PRESS_MS = 500;
/** How often the key icon re-checks whether the front window is in the ring. */
const POLL_MS = 3000;
/** Built-in macOS sound played on long-press when enabled. */
const SOUND_FILE = "/System/Library/Sounds/Tink.aiff";

/**
 * A user-curated ring of windows. Long-press adds the frontmost window (or
 * removes it if already in the ring); a short tap focuses the next window. The
 * long-press is detected at the threshold *while still held*, so feedback (a
 * key flash, plus an optional sound) fires the moment it registers.
 */
@action({ UUID: "com.movingavg.switchboard.windowring" })
export class WindowRing extends SingletonAction<WindowRingSettings> {
	private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();
	private readonly visible = new Map<string, KeyAction<WindowRingSettings>>();
	private timer?: ReturnType<typeof setInterval>;

	override async onWillAppear(ev: WillAppearEvent<WindowRingSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => void this.refreshAll(), POLL_MS);
		}
		await this.updateIcon(ev.action, ev.payload.settings.windows ?? []);
	}

	override onWillDisappear(ev: WillDisappearEvent<WindowRingSettings>): void {
		this.visible.delete(ev.action.id);
		const t = this.pending.get(ev.action.id);
		if (t !== undefined) clearTimeout(t);
		this.pending.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override onKeyDown(ev: KeyDownEvent<WindowRingSettings>): void {
		const id = ev.action.id;
		// Fire the long-press handler at the threshold, while the key is still held.
		const t = setTimeout(() => {
			this.pending.delete(id);
			void this.handleLongPress(ev.action, ev.payload.settings).catch((err) =>
				streamDeck.logger.error(`Window Ring long-press failed: ${String(err)}`),
			);
		}, LONG_PRESS_MS);
		this.pending.set(id, t);
	}

	override async onKeyUp(ev: KeyUpEvent<WindowRingSettings>): Promise<void> {
		const t = this.pending.get(ev.action.id);
		if (t === undefined) return; // long press already handled at the threshold
		clearTimeout(t);
		this.pending.delete(ev.action.id);
		await this.handleShortPress(ev.action, ev.payload.settings);
	}

	/** Long press: toggle the frontmost window in the ring + give feedback. */
	private async handleLongPress(
		action: KeyAction<WindowRingSettings>,
		settings: WindowRingSettings,
	): Promise<void> {
		const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
		if (!front.ok) {
			this.warn(front.code, "read the front window");
			await action.showAlert();
			return;
		}
		const window = parseFrontWindow(front.stdout);
		const before = settings.windows ?? [];
		const { list } = toggleWindow(before, window);
		if (list.length === before.length) {
			await action.showAlert(); // nothing to add (no frontmost window)
			return;
		}
		await action.setSettings({ ...settings, windows: list, cursor: settings.cursor ?? -1 });
		await action.showOk(); // visual: the long-press registered
		this.playSound(settings); // audio: optional
		await this.updateIcon(action, list);
	}

	/** Short tap: focus the next window in the ring (round-robin). */
	private async handleShortPress(
		action: KeyAction<WindowRingSettings>,
		settings: WindowRingSettings,
	): Promise<void> {
		const list = settings.windows ?? [];
		if (list.length === 0) {
			await action.showAlert();
			return;
		}
		const cursor = nextIndex(list.length, settings.cursor ?? -1);
		const target = list[cursor];
		const result = await runAppleScript(
			buildAppScript(resolveApp({ appName: target.app, titlePattern: target.title })),
		);
		if (!result.ok) {
			this.warn(result.code, `focus ${target.app}`);
			await action.showAlert();
		}
		await action.setSettings({ ...settings, cursor });
		await this.updateIcon(action, list);
	}

	/** Fire-and-forget system sound when enabled. */
	private playSound(settings: WindowRingSettings): void {
		if (settings.sound !== true) return;
		execFile("/usr/bin/afplay", [SOUND_FILE], () => {
			/* best-effort; ignore errors */
		});
	}

	private async refreshAll(): Promise<void> {
		for (const action of this.visible.values()) {
			const settings = await action.getSettings();
			await this.updateIcon(action, settings.windows ?? []);
		}
	}

	/** Paint the count + a green/grey ring depending on whether the front window is a member. */
	private async updateIcon(action: KeyAction<WindowRingSettings>, list: RingWindow[]): Promise<void> {
		try {
			const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
			const inList = front.ok ? indexOfWindow(list, parseFrontWindow(front.stdout)) >= 0 : false;
			await action.setImage(svgToDataUri(buildRingImage(list.length, inList)));
		} catch (err) {
			streamDeck.logger.debug(`Window Ring icon update skipped: ${String(err)}`);
		}
	}

	private warn(code: string, what: string): void {
		if (code === "permission-denied") {
			streamDeck.logger.error(
				`Window Ring could not ${what}. Grant Accessibility: System Settings > Privacy & ` +
					"Security > Accessibility > enable Stream Deck.",
			);
		} else {
			streamDeck.logger.error(`Window Ring failed to ${what} (${code}).`);
		}
	}
}
