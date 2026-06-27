import streamDeck, { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import { type AppSettings, buildAppScript, resolveApp } from "../mac/apps.js";

/**
 * Open or switch to an app, optionally focusing a window whose title contains a
 * pattern. `activate` both launches (if needed) and switches; with a title
 * pattern, System Events raises the first matching window.
 */
@action({ UUID: "com.movingavg.switchboard.switchapp" })
export class SwitchApp extends SingletonAction<AppSettings> {
	override async onKeyDown(ev: KeyDownEvent<AppSettings>): Promise<void> {
		const app = resolveApp(ev.payload.settings ?? {});
		const script = buildAppScript(app);

		if (!script) {
			streamDeck.logger.warn("Open/Switch App pressed with no application configured.");
			await ev.action.showAlert();
			return;
		}

		const result = await runAppleScript(script);

		if (result.ok) {
			await ev.action.showOk();
			return;
		}

		await ev.action.showAlert();
		if (result.code === "permission-denied") {
			streamDeck.logger.error(
				"App switch blocked. Grant access in System Settings > Privacy & Security: " +
					"Automation (the target app) and, for title matching, Accessibility > Stream Deck.",
			);
		} else {
			streamDeck.logger.error(`Open/Switch App failed: ${result.stderr || result.code}`);
		}
	}
}
