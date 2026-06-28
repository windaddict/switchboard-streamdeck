import streamDeck, {
	action,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	type JsonValue,
	type SendToPluginEvent,
	SingletonAction,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { rotationDirection } from "../mac/rotation.js";
import { respondToAccessibilityCheck } from "./pi-permissions.js";
import {
	DEFAULT_SCHEME,
	FULL_CELL,
	nextTile,
	SCHEME_LABELS,
	type TileSettings,
} from "../mac/tile.js";
import { runTile } from "../mac/tile-runner.js";

/**
 * Dial action: rotate to walk the frontmost window through a grid of positions;
 * each rotation direction has its own configurable arrangement (halves, thirds,
 * quarters, or 2-row grids). Same scheme on both directions → CCW reverses CW.
 * Press maximizes the window within the screen's visible frame.
 */
@action({ UUID: "com.movingavg.switchboard.tile" })
export class ArrangeWindow extends SingletonAction<TileSettings> {
	override async onWillAppear(ev: WillAppearEvent<TileSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.render(ev.action, ev.payload.settings);
		}
	}

	override async onDialRotate(ev: DialRotateEvent<TileSettings>): Promise<void> {
		// Invert the reported tick sign so the window FOLLOWS the wheel: turning
		// the dial counter-clockwise walks the window counter-clockwise around the
		// grid (and selects the ccw scheme), and clockwise orbits it clockwise.
		// Our serpentine order advances "forward" = clockwise, so without this the
		// motion ran opposite to the physical rotation.
		const direction = rotationDirection(-ev.payload.ticks);
		if (direction === "none") return;

		const step = nextTile(ev.payload.settings, direction);
		const updated: TileSettings = {
			...ev.payload.settings,
			activeScheme: step.activeScheme,
			index: step.index,
		};
		await ev.action.setSettings(updated);

		const result = await runTile(step.cell, import.meta.url);
		if (!result.trusted) this.warnUntrusted();
		await this.render(ev.action, updated, step.position);
	}

	override async onDialDown(ev: DialDownEvent<TileSettings>): Promise<void> {
		// Press = maximize within the visible frame, and reset the cursor so the
		// next rotation starts fresh from the first cell.
		const updated: TileSettings = { ...ev.payload.settings, index: -1 };
		await ev.action.setSettings(updated);
		const result = await runTile(FULL_CELL, import.meta.url);
		if (!result.trusted) this.warnUntrusted();
		await this.render(ev.action, updated, "max");
	}

	/** Answer the property inspector's live Accessibility-permission check. */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, TileSettings>): Promise<void> {
		await respondToAccessibilityCheck(ev.payload, import.meta.url);
	}

	/** Touchscreen readout: the active arrangement + position; never blocks. */
	private async render(
		dial: DialAction<TileSettings>,
		settings: TileSettings,
		value?: string,
	): Promise<void> {
		const scheme = settings.activeScheme ?? settings.cwScheme ?? DEFAULT_SCHEME;
		try {
			await dial.setFeedback({
				title: "Arrange",
				value: value ?? SCHEME_LABELS[scheme],
			});
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}

	private warnUntrusted(): void {
		streamDeck.logger.error(
			"Arrange Window blocked. Grant Accessibility: System Settings > Privacy & " +
				"Security > Accessibility > enable Stream Deck (moving windows needs this).",
		);
	}
}
