import streamDeck, { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

import { buildJumpScript } from "../safari/applescript.js";
import { runAppleScript } from "../safari/runner.js";
import { resolveTarget, type TargetSettings } from "../safari/targets.js";

/**
 * Jump to (or open) a Safari tab. Settings are per-key, so there is no shared
 * target list to clobber — each button owns its own target.
 */
@action({ UUID: "com.johnknox.safarijump.jump" })
export class JumpToTab extends SingletonAction<TargetSettings> {
	override async onKeyDown(ev: KeyDownEvent<TargetSettings>): Promise<void> {
		const target = resolveTarget(ev.payload.settings ?? {});

		if (!target.url) {
			streamDeck.logger.warn("Jump to Tab pressed with no URL configured.");
			await ev.action.showAlert();
			return;
		}

		const result = await runAppleScript(buildJumpScript(target));

		if (result.ok) {
			await ev.action.showOk();
			return;
		}

		await ev.action.showAlert();
		if (result.code === "permission-denied") {
			streamDeck.logger.error(
				"Safari automation blocked. Grant access: System Settings > Privacy & Security > " +
					"Automation > Stream Deck > enable Safari (and System Events for private windows).",
			);
		} else {
			streamDeck.logger.error(`Jump to Tab failed: ${result.stderr || "unknown error"}`);
		}
	}
}
