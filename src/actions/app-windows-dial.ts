import streamDeck, {
	action,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	type JsonValue,
	type SendToPluginEvent,
	SingletonAction,
	type TouchTapEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import {
	appCycleScript,
	appWindowCycleScript,
	type AppWindowsMode,
	appWindowsFeedback,
	FRONT_WINDOW_SCRIPT,
	parseFrontWindow,
	toggleAppWindowsMode,
} from "../mac/app-windows.js";
import { rotationDirection } from "../mac/rotation.js";
import { respondToAccessibilityCheck } from "./pi-permissions.js";

type AppWindowsSettings = Record<string, never>;

/**
 * Dial action: cycle the windows of the frontmost application, or — after a
 * press/touch-tap toggles the dial into "apps" mode — cycle the visible
 * applications themselves. The touchscreen shows the current mode and the
 * front app/window, refreshed after each step. The mode is transient (held in
 * memory per dial), so every appearance starts in the familiar windows mode.
 */
@action({ UUID: "com.movingavg.switchboard.appwindows" })
export class CycleAppWindows extends SingletonAction<AppWindowsSettings> {
	private readonly modes = new Map<string, AppWindowsMode>();

	override async onWillAppear(ev: WillAppearEvent<AppWindowsSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refresh(ev.action);
		}
	}

	override onWillDisappear(ev: WillDisappearEvent<AppWindowsSettings>): void {
		this.modes.delete(ev.action.id);
	}

	override async onDialRotate(ev: DialRotateEvent<AppWindowsSettings>): Promise<void> {
		const direction = rotationDirection(ev.payload.ticks);
		if (direction === "none") {
			await this.refresh(ev.action);
			return;
		}

		const mode = this.mode(ev.action.id);
		const script = mode === "apps" ? appCycleScript(direction) : appWindowCycleScript(direction);
		const result = await runAppleScript(script);
		if (!result.ok && result.code === "permission-denied") {
			streamDeck.logger.error(
				"Window cycling blocked. Grant Accessibility: System Settings > Privacy & " +
					"Security > Accessibility > enable Stream Deck.",
			);
		}

		// The cycle script already returns the activated app's name — paint from
		// it directly instead of spending a second osascript round-trip per tick.
		if (mode === "apps" && result.ok && result.stdout.trim() !== "") {
			await this.paint(ev.action, appWindowsFeedback("apps", { app: result.stdout.trim(), title: "" }));
			return;
		}
		await this.refresh(ev.action);
	}

	override async onDialDown(ev: DialDownEvent<AppWindowsSettings>): Promise<void> {
		await this.toggle(ev.action);
	}

	override async onTouchTap(ev: TouchTapEvent<AppWindowsSettings>): Promise<void> {
		await this.toggle(ev.action);
	}

	/** Answer the property inspector's live Accessibility-permission check. */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, AppWindowsSettings>): Promise<void> {
		await respondToAccessibilityCheck(ev.payload, import.meta.url);
	}

	private mode(id: string): AppWindowsMode {
		return this.modes.get(id) ?? "windows";
	}

	private async toggle(dial: DialAction<AppWindowsSettings>): Promise<void> {
		this.modes.set(dial.id, toggleAppWindowsMode(this.mode(dial.id)));
		await this.refresh(dial);
	}

	private async refresh(dial: DialAction<AppWindowsSettings>): Promise<void> {
		const result = await runAppleScript(FRONT_WINDOW_SCRIPT);
		if (!result.ok) return;
		await this.paint(dial, appWindowsFeedback(this.mode(dial.id), parseFrontWindow(result.stdout)));
	}

	private async paint(
		dial: DialAction<AppWindowsSettings>,
		feedback: { title: string; value: string },
	): Promise<void> {
		try {
			await dial.setFeedback(feedback);
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
