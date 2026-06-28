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
import { svgToDataUri } from "../mac/svg.js";
import {
	adjustCursorAfterRemoval,
	buildRingImage,
	classifyToggle,
	indexOfWindow,
	nextIndex,
	type RingWindow,
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
/** How long the red "removed" flash stays before reverting to the count icon. */
const REMOVE_FLASH_MS = 900;
/** Built-in macOS sound played on long-press when enabled. */
const SOUND_FILE = "/System/Library/Sounds/Tink.aiff";

/**
 * A user-curated ring of windows. Long-press adds the frontmost window (or
 * removes it); a short tap focuses the next. Handlers always read fresh
 * settings via getSettings() so rapid presses don't clobber each other.
 */
@action({ UUID: "com.movingavg.switchboard.windowring" })
export class WindowRing extends SingletonAction<WindowRingSettings> {
	private readonly pressTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private readonly revertTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
		const id = ev.action.id;
		this.visible.delete(id);
		this.clearTimer(this.pressTimers, id);
		this.clearTimer(this.revertTimers, id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override onKeyDown(ev: KeyDownEvent<WindowRingSettings>): void {
		const id = ev.action.id;
		this.clearTimer(this.revertTimers, id); // a new press cancels a pending revert
		const t = setTimeout(() => {
			this.pressTimers.delete(id);
			void this.handleLongPress(ev.action).catch((err) =>
				streamDeck.logger.error(`Window Ring long-press failed: ${String(err)}`),
			);
		}, LONG_PRESS_MS);
		this.pressTimers.set(id, t);
	}

	override async onKeyUp(ev: KeyUpEvent<WindowRingSettings>): Promise<void> {
		const t = this.pressTimers.get(ev.action.id);
		if (t === undefined) return; // long press already fired at the threshold
		clearTimeout(t);
		this.pressTimers.delete(ev.action.id);
		await this.handleShortPress(ev.action);
	}

	/** Long press: toggle the frontmost window in the ring + give feedback. */
	private async handleLongPress(action: KeyAction<WindowRingSettings>): Promise<void> {
		const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
		if (!front.ok) {
			this.warn(front.code, "read the front window");
			await action.showAlert();
			return;
		}

		const settings = await action.getSettings(); // fresh — avoids rapid-press races
		const before = settings.windows ?? [];
		const { list, outcome, removedIndex } = classifyToggle(before, parseFrontWindow(front.stdout));

		if (outcome === "noop") {
			streamDeck.logger.debug("Window Ring long-press with no frontmost window to add.");
			await action.showAlert();
			return;
		}

		const cursor = adjustCursorAfterRemoval(settings.cursor ?? -1, removedIndex);
		await action.setSettings({ ...settings, windows: list, cursor });
		this.playSound(settings);

		if (outcome === "added") {
			await action.showOk(); // green check = added
			await this.updateIcon(action, list);
		} else {
			// removed: distinct red "−" flash, then revert to the live icon
			await action.setImage(svgToDataUri(buildRingImage(list.length, false, "removed")));
			this.clearTimer(this.revertTimers, action.id);
			this.revertTimers.set(
				action.id,
				setTimeout(() => {
					this.revertTimers.delete(action.id);
					void this.refreshIcon(action);
				}, REMOVE_FLASH_MS),
			);
		}
	}

	/** Short tap: focus the next window in the ring (round-robin). */
	private async handleShortPress(action: KeyAction<WindowRingSettings>): Promise<void> {
		const settings = await action.getSettings(); // fresh
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
			return;
		}
		await action.setSettings({ ...settings, cursor });
		// We just focused a ring member, so the front window is in the list by
		// definition — paint directly instead of spending a second osascript
		// round-trip (FRONT_WINDOW_SCRIPT) just to rediscover that.
		await this.paintIcon(action, list, target);
	}

	private async refreshAll(): Promise<void> {
		const front = await runAppleScript(FRONT_WINDOW_SCRIPT); // once per tick
		const current = front.ok ? parseFrontWindow(front.stdout) : null;
		for (const action of this.visible.values()) {
			const settings = await action.getSettings();
			await this.paintIcon(action, settings.windows ?? [], current);
		}
	}

	/** Re-read settings and repaint (used by the revert timer). */
	private async refreshIcon(action: KeyAction<WindowRingSettings>): Promise<void> {
		const settings = await action.getSettings();
		await this.updateIcon(action, settings.windows ?? []);
	}

	private async updateIcon(action: KeyAction<WindowRingSettings>, list: RingWindow[]): Promise<void> {
		const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
		await this.paintIcon(action, list, front.ok ? parseFrontWindow(front.stdout) : null);
	}

	private async paintIcon(
		action: KeyAction<WindowRingSettings>,
		list: RingWindow[],
		current: RingWindow | null,
	): Promise<void> {
		try {
			const inList = current ? indexOfWindow(list, current) >= 0 : false;
			await action.setImage(svgToDataUri(buildRingImage(list.length, inList)));
		} catch (err) {
			streamDeck.logger.debug(`Window Ring icon update skipped: ${String(err)}`);
		}
	}

	private clearTimer(map: Map<string, ReturnType<typeof setTimeout>>, id: string): void {
		const t = map.get(id);
		if (t !== undefined) clearTimeout(t);
		map.delete(id);
	}

	private playSound(settings: WindowRingSettings): void {
		if (settings.sound !== true) return;
		execFile("/usr/bin/afplay", [SOUND_FILE], () => {
			/* best-effort; ignore errors */
		});
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
