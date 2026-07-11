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

import { rotationDirection } from "../mac/rotation.js";
import { respondToAccessibilityCheck } from "./pi-permissions.js";
import {
	activeTileScheme,
	FULL_CELL,
	nextTile,
	SCHEME_LABELS,
	type TileSettings,
	toggledTileScheme,
} from "../mac/tile.js";
import { runTile } from "../mac/tile-runner.js";

/**
 * Dial action: rotate to walk the frontmost window through the active
 * arrangement — clockwise steps forward, counter-clockwise retraces the same
 * style in reverse. Touch-tap toggles between the button's two configured
 * arrangements (e.g. columns ↔ grid). Press maximizes the window within the
 * screen's visible frame.
 */
@action({ UUID: "com.movingavg.switchboard.tile" })
export class ArrangeWindow extends SingletonAction<TileSettings> {
	override async onWillAppear(ev: WillAppearEvent<TileSettings>): Promise<void> {
		if (ev.action.isDial()) {
			await this.render(ev.action, ev.payload.settings);
		}
	}

	override async onDialRotate(ev: DialRotateEvent<TileSettings>): Promise<void> {
		// Clockwise → cw scheme stepping forward; counter-clockwise → ccw scheme
		// stepping in reverse (nextTile handles that). The dial reports clockwise
		// as positive ticks; `invertDial` flips this for hardware that reports
		// rotation the other way.
		let direction = rotationDirection(ev.payload.ticks);
		if (direction === "none") return;
		if (ev.payload.settings.invertDial) {
			direction = direction === "next" ? "prev" : "next";
		}

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

	/** Touch-tap: toggle between the two configured arrangements (A ↔ B). */
	override async onTouchTap(ev: TouchTapEvent<TileSettings>): Promise<void> {
		const updated: TileSettings = {
			...ev.payload.settings,
			activeScheme: toggledTileScheme(ev.payload.settings),
			index: -1, // fresh entry: the next turn starts the new arrangement cleanly
		};
		await ev.action.setSettings(updated);
		await this.render(ev.action, updated);
	}

	/** Answer the property inspector's live Accessibility-permission check. */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, TileSettings>): Promise<void> {
		await respondToAccessibilityCheck(ev.payload, import.meta.url);
	}

	/** Touchscreen readout (shared mode-dial layout): arrangement + position. */
	private async render(
		dial: DialAction<TileSettings>,
		settings: TileSettings,
		position?: string,
	): Promise<void> {
		try {
			await dial.setFeedback({
				mode: { value: `${SCHEME_LABELS[activeTileScheme(settings)]} ⇄`, color: "#4E9CFF" },
				current: position ?? "—",
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
