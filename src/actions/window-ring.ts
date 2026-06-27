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
};

/** Press held this long (ms) counts as a long press (add/remove). */
const LONG_PRESS_MS = 500;
/** How often the key icon re-checks whether the front window is in the ring. */
const POLL_MS = 3000;

/**
 * A user-curated ring of windows. Long-press adds the frontmost window (or
 * removes it if already in the ring); a short tap focuses the next window. The
 * key shows the count and a green ring when the current window is a member.
 */
@action({ UUID: "com.movingavg.switchboard.windowring" })
export class WindowRing extends SingletonAction<WindowRingSettings> {
	private readonly downAt = new Map<string, number>();
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
		this.downAt.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override onKeyDown(ev: KeyDownEvent<WindowRingSettings>): void {
		this.downAt.set(ev.action.id, Date.now());
	}

	override async onKeyUp(ev: KeyUpEvent<WindowRingSettings>): Promise<void> {
		const down = this.downAt.get(ev.action.id);
		this.downAt.delete(ev.action.id);
		const isLong = down !== undefined && Date.now() - down >= LONG_PRESS_MS;

		if (isLong) {
			await this.handleLongPress(ev);
		} else {
			await this.handleShortPress(ev);
		}
	}

	/** Long press: add the frontmost window, or remove it if already in the ring. */
	private async handleLongPress(ev: KeyUpEvent<WindowRingSettings>): Promise<void> {
		const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
		if (!front.ok) {
			this.warn(front.code, "read the front window");
			await ev.action.showAlert();
			return;
		}
		const window = parseFrontWindow(front.stdout);
		const settings = ev.payload.settings;
		const { list, added } = toggleWindow(settings.windows ?? [], window);
		if (!added && list.length === (settings.windows ?? []).length) {
			// nothing changed (e.g. no frontmost window)
			await ev.action.showAlert();
			return;
		}
		await ev.action.setSettings({ ...settings, windows: list, cursor: settings.cursor ?? -1 });
		await ev.action.showOk();
		await this.updateIcon(ev.action, list);
	}

	/** Short tap: focus the next window in the ring (round-robin). */
	private async handleShortPress(ev: KeyUpEvent<WindowRingSettings>): Promise<void> {
		const settings = ev.payload.settings;
		const list = settings.windows ?? [];
		if (list.length === 0) {
			await ev.action.showAlert();
			return;
		}
		const cursor = nextIndex(list.length, settings.cursor ?? -1);
		const target = list[cursor];
		const result = await runAppleScript(
			buildAppScript(resolveApp({ appName: target.app, titlePattern: target.title })),
		);
		if (!result.ok) {
			this.warn(result.code, `focus ${target.app}`);
			await ev.action.showAlert();
		}
		await ev.action.setSettings({ ...settings, cursor });
		await this.updateIcon(ev.action, list);
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
