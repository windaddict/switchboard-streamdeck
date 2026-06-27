import streamDeck, {
	action,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import {
	buildKeystrokeScript,
	jumpTopPlan,
	nextSpeed,
	normalizeLinesPerTick,
	scrollPlan,
	type ScrollSettings,
	type Speed,
} from "../mac/scroll.js";

/**
 * Dial action: rotate to scroll the frontmost window; press to either jump to
 * the top of the document or toggle between fast and slow scrolling. Defaults
 * are applied here (speed → slow, press → jump-to-top) so behaviour does not
 * depend on the property inspector persisting its dropdown defaults.
 */
@action({ UUID: "com.johnknox.safarijump.scroll" })
export class ScrollWindow extends SingletonAction<ScrollSettings> {
	override async onWillAppear(ev: WillAppearEvent<ScrollSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.render(ev.action, ev.payload.settings);
		}
	}

	override async onDialRotate(ev: DialRotateEvent<ScrollSettings>): Promise<void> {
		const speed: Speed = ev.payload.settings.speed ?? "slow";
		const linesPerTick = normalizeLinesPerTick(ev.payload.settings.linesPerTick);
		const plan = scrollPlan(ev.payload.ticks, speed, linesPerTick);
		if (plan.repeats <= 0) return;

		const result = await runAppleScript(buildKeystrokeScript(plan));
		if (!result.ok) this.warn(result.code);
	}

	override async onDialDown(ev: DialDownEvent<ScrollSettings>): Promise<void> {
		const settings = ev.payload.settings;

		if (settings.pressAction === "toggleSpeed") {
			const speed = nextSpeed(settings.speed ?? "slow");
			const updated: ScrollSettings = { ...settings, speed };
			await ev.action.setSettings(updated);
			await this.render(ev.action, updated);
			return;
		}

		// Default press behaviour: jump to the top of the document (⌘↑).
		const result = await runAppleScript(buildKeystrokeScript(jumpTopPlan()));
		if (!result.ok) this.warn(result.code);
	}

	/** Best-effort touchscreen readout of the current speed; never blocks scrolling. */
	private async render(dial: DialAction<ScrollSettings>, settings: ScrollSettings): Promise<void> {
		const speed = settings.speed ?? "slow";
		try {
			await dial.setFeedback({
				title: "Scroll",
				value: speed === "fast" ? "Fast" : "Slow",
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
