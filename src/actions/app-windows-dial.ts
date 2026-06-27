import streamDeck, {
	action,
	type DialAction,
	type DialRotateEvent,
	SingletonAction,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import { appWindowCycleScript, FRONT_WINDOW_SCRIPT, parseFrontWindow } from "../mac/app-windows.js";
import { rotationDirection } from "../mac/rotation.js";

type AppWindowsSettings = Record<string, never>;

/**
 * Dial action: cycle the windows of the frontmost application using the macOS
 * "Move focus to next window" shortcut. The touchscreen shows the front app and
 * its current window title, refreshed after each step.
 */
@action({ UUID: "com.movingavg.switchboard.appwindows" })
export class CycleAppWindows extends SingletonAction<AppWindowsSettings> {
	override async onWillAppear(ev: WillAppearEvent<AppWindowsSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.refresh(ev.action);
		}
	}

	override async onDialRotate(ev: DialRotateEvent<AppWindowsSettings>): Promise<void> {
		const direction = rotationDirection(ev.payload.ticks);
		if (direction !== "none") {
			const result = await runAppleScript(appWindowCycleScript(direction));
			if (!result.ok && result.code === "permission-denied") {
				streamDeck.logger.error(
					"Window cycling blocked. Grant Accessibility: System Settings > Privacy & " +
						"Security > Accessibility > enable Stream Deck.",
				);
			}
		}
		await this.refresh(ev.action);
	}

	private async refresh(dial: DialAction<AppWindowsSettings>): Promise<void> {
		const result = await runAppleScript(FRONT_WINDOW_SCRIPT);
		if (!result.ok) return;
		const { app, title } = parseFrontWindow(result.stdout);
		try {
			await dial.setFeedback({ title: app || "Windows", value: title || "—" });
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
