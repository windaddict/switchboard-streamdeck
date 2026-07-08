import streamDeck, {
	action,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	SingletonAction,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { PressGate } from "../mac/press-gate.js";
import { buildJumpScript, FRONT_TAB_URL_SCRIPT } from "../safari/applescript.js";
import { runAppleScript } from "../safari/runner.js";
import { captureTarget, resolveTarget, type TargetSettings } from "../safari/targets.js";

/**
 * Jump to (or open) a Safari tab. Settings are per-key, so there is no shared
 * target list to clobber — each button owns its own target. Holding the key
 * ("teach the button") captures Safari's current front tab as the new target.
 */
@action({ UUID: "com.movingavg.switchboard.jump" })
export class JumpToTab extends SingletonAction<TargetSettings> {
	private readonly gate = new PressGate();

	override onKeyDown(ev: KeyDownEvent<TargetSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((err) =>
				streamDeck.logger.error(`Jump to Tab capture failed: ${String(err)}`),
			);
		});
	}

	override async onKeyUp(ev: KeyUpEvent<TargetSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return; // long press already captured
		await this.jump(ev.action);
	}

	override onWillDisappear(ev: WillDisappearEvent<TargetSettings>): void {
		this.gate.cancel(ev.action.id);
	}

	/** Short press: focus (or open) the configured tab. */
	private async jump(key: KeyAction<TargetSettings>): Promise<void> {
		const target = resolveTarget((await key.getSettings()) ?? {});

		if (!target.url) {
			streamDeck.logger.warn("Jump to Tab pressed with no URL configured.");
			await key.showAlert();
			return;
		}

		const result = await runAppleScript(buildJumpScript(target));

		if (result.ok) {
			await key.showOk();
			return;
		}

		await key.showAlert();
		if (result.code === "permission-denied") {
			streamDeck.logger.error(
				"Safari automation blocked. Grant access: System Settings > Privacy & Security > " +
					"Automation > Stream Deck > enable Safari (and System Events for private windows).",
			);
		} else {
			streamDeck.logger.error(`Jump to Tab failed: ${result.stderr || "unknown error"}`);
		}
	}

	/** Long press: capture Safari's current front tab into this button. */
	private async capture(key: KeyAction<TargetSettings>): Promise<void> {
		const result = await runAppleScript(FRONT_TAB_URL_SCRIPT);
		const updated = result.ok ? captureTarget(result.stdout.trim(), await key.getSettings()) : null;
		if (updated === null) {
			streamDeck.logger.warn(`Jump to Tab capture: no front tab URL (${result.stderr || "empty"}).`);
			await key.showAlert();
			return;
		}
		await key.setSettings(updated);
		streamDeck.logger.info(`Jump to Tab captured ${updated.url}.`);
		await key.showOk();
	}
}
