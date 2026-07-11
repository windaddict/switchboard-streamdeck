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
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import { respondToAccessibilityCheck } from "./pi-permissions.js";
import {
	buildKeystrokeScript,
	jumpTopPlan,
	nextSpeed,
	normalizeLinesPerTick,
	scrollLines,
	type ScrollSettings,
	type Speed,
} from "../mac/scroll.js";
import { runScroll } from "../mac/scroll-runner.js";

/**
 * Dial action: rotate to scroll the frontmost window; press to either jump to
 * the top of the document or toggle between fast and slow scrolling; touch-tap
 * always toggles the speed (so both gestures are available at once). Defaults
 * are applied here (speed → slow, press → jump-to-top) so behaviour does not
 * depend on the property inspector persisting its dropdown defaults.
 */
@action({ UUID: "com.movingavg.switchboard.scroll" })
export class ScrollWindow extends SingletonAction<ScrollSettings> {
	override async onWillAppear(ev: WillAppearEvent<ScrollSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.render(ev.action, ev.payload.settings);
		}
	}

	override async onDialRotate(ev: DialRotateEvent<ScrollSettings>): Promise<void> {
		const speed: Speed = ev.payload.settings.speed ?? "slow";
		const linesPerTick = normalizeLinesPerTick(ev.payload.settings.linesPerTick);
		const lines = scrollLines(ev.payload.ticks, speed, linesPerTick);
		if (lines === 0) return;

		// One proportional scroll-wheel event via the native helper — no keystroke
		// spam, so the line count actually scales and there is no per-press lag.
		const result = await runScroll(lines, import.meta.url);
		if (!result.trusted) {
			streamDeck.logger.error(
				"Scroll blocked. Grant Accessibility: System Settings > Privacy & Security > " +
					"Accessibility > enable Stream Deck (synthetic scroll needs this).",
			);
		}
	}

	override async onDialDown(ev: DialDownEvent<ScrollSettings>): Promise<void> {
		const settings = ev.payload.settings;

		if (settings.pressAction === "toggleSpeed") {
			await this.toggleSpeed(ev.action, settings);
			return;
		}

		// Default press behaviour: jump to the top of the document (⌘↑).
		const result = await runAppleScript(buildKeystrokeScript(jumpTopPlan()));
		if (!result.ok) this.warn(result.code);
	}

	/** Touch-tap: always toggle fast/slow, regardless of the press setting. */
	override async onTouchTap(ev: TouchTapEvent<ScrollSettings>): Promise<void> {
		await this.toggleSpeed(ev.action, ev.payload.settings);
	}

	private async toggleSpeed(dial: DialAction<ScrollSettings>, settings: ScrollSettings): Promise<void> {
		const updated: ScrollSettings = { ...settings, speed: nextSpeed(settings.speed ?? "slow") };
		await dial.setSettings(updated);
		await this.render(dial, updated);
	}

	/** Answer the property inspector's live Accessibility-permission check. */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, ScrollSettings>): Promise<void> {
		await respondToAccessibilityCheck(ev.payload, import.meta.url);
	}

	/** Best-effort touchscreen readout of the current speed; never blocks
	 * scrolling. Shared mode-dial layout; the ⇄ marks the tap-to-toggle. */
	private async render(dial: DialAction<ScrollSettings>, settings: ScrollSettings): Promise<void> {
		const speed = settings.speed ?? "slow";
		try {
			await dial.setFeedback({
				mode: { value: "Scroll ⇄", color: "#4E9CFF" },
				current: speed === "fast" ? "Fast" : "Slow",
			});
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}

	private warn(code: string): void {
		if (code === "permission-denied") {
			streamDeck.logger.error(
				"Scroll blocked. Grant Accessibility: System Settings > Privacy & Security > " +
					"Accessibility > enable Stream Deck (sending keystrokes needs this).",
			);
		} else {
			streamDeck.logger.error(`Scroll failed: ${code}`);
		}
	}
}
