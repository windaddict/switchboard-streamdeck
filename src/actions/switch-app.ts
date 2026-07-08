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
import { FRONT_WINDOW_SCRIPT, parseFrontWindow } from "../mac/app-windows.js";
import { type AppSettings, buildAppScript, captureApp, resolveApp } from "../mac/apps.js";
import { PressGate } from "../mac/press-gate.js";
import { respondToAccessibilityCheck } from "./pi-permissions.js";

/**
 * Open or switch to an app, optionally focusing a window whose title contains a
 * pattern. `activate` both launches (if needed) and switches; with a title
 * pattern, System Events raises the first matching window. Holding the key
 * ("teach the button") captures the frontmost app as the new target.
 */
@action({ UUID: "com.movingavg.switchboard.switchapp" })
export class SwitchApp extends SingletonAction<AppSettings> {
	private readonly gate = new PressGate();

	override onKeyDown(ev: KeyDownEvent<AppSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((err) =>
				streamDeck.logger.error(`Open/Switch App capture failed: ${String(err)}`),
			);
		});
	}

	override async onKeyUp(ev: KeyUpEvent<AppSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return; // long press already captured
		await this.switchTo(ev.action);
	}

	override onWillDisappear(ev: WillDisappearEvent<AppSettings>): void {
		this.gate.cancel(ev.action.id);
	}

	/** Short press: open or switch to the configured app. */
	private async switchTo(key: KeyAction<AppSettings>): Promise<void> {
		const app = resolveApp((await key.getSettings()) ?? {});
		const script = buildAppScript(app);

		if (!script) {
			streamDeck.logger.warn("Open/Switch App pressed with no application configured.");
			await key.showAlert();
			return;
		}

		const result = await runAppleScript(script);

		if (result.ok) {
			await key.showOk();
			return;
		}

		await key.showAlert();
		if (result.code === "permission-denied") {
			streamDeck.logger.error(
				"App switch blocked. Grant access in System Settings > Privacy & Security: " +
					"Automation (the target app) and, for title matching, Accessibility > Stream Deck.",
			);
		} else {
			streamDeck.logger.error(`Open/Switch App failed: ${result.stderr || result.code}`);
		}
	}

	/** Long press: capture the frontmost app into this button. */
	private async capture(key: KeyAction<AppSettings>): Promise<void> {
		const result = await runAppleScript(FRONT_WINDOW_SCRIPT);
		const updated = result.ok
			? captureApp(parseFrontWindow(result.stdout).app, await key.getSettings())
			: null;
		if (updated === null) {
			streamDeck.logger.warn(`Open/Switch App capture: no frontmost app (${result.stderr || "empty"}).`);
			await key.showAlert();
			return;
		}
		await key.setSettings(updated);
		streamDeck.logger.info(`Open/Switch App captured ${updated.appName}.`);
		await key.showOk();
	}

	/** Answer the property inspector's live Accessibility-permission check. */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, AppSettings>): Promise<void> {
		await respondToAccessibilityCheck(ev.payload, import.meta.url);
	}
}
