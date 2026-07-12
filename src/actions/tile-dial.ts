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

import { rotationSteps } from "../mac/rotation.js";
import { serialize } from "../mac/serialize.js";
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
		// The dial reports clockwise as positive ticks; `invertDial` flips this
		// for hardware that reports rotation the other way. Rotations are
		// SERIALIZED per dial (a read-modify-write of the cursor around an async
		// helper call would otherwise interleave and double-place cells) and the
		// full tick count is consumed so a fast spin isn't collapsed to one step.
		let { direction, steps } = rotationSteps(ev.payload.ticks);
		if (direction === "none") return;
		if (ev.payload.settings.invertDial) {
			direction = direction === "next" ? "prev" : "next";
		}
		const dir = direction;

		await serialize(ev.action.id, async () => {
			let settings = await ev.action.getSettings(); // fresh — not the event snapshot
			for (let i = 0; i < steps; i++) {
				const step = nextTile(settings, dir);
				const result = await runTile(step.cell, import.meta.url);
				if (!result.trusted) this.warnUntrusted();
				if (!result.ok) {
					// The helper reported no window moved — do not persist or
					// render a position the screen doesn't show.
					streamDeck.logger.warn("Arrange Window: helper reported no focused window/screen.");
					return;
				}
				settings = { ...settings, activeScheme: step.activeScheme, index: step.index };
				await ev.action.setSettings(settings);
				await this.render(ev.action, settings, step.position);
			}
		});
	}

	override async onDialDown(ev: DialDownEvent<TileSettings>): Promise<void> {
		// Press = maximize within the visible frame, and reset the cursor so the
		// next rotation starts fresh from the first cell.
		await serialize(ev.action.id, async () => {
			const result = await runTile(FULL_CELL, import.meta.url);
			if (!result.trusted) this.warnUntrusted();
			if (!result.ok) return; // nothing moved — keep the real state
			const updated: TileSettings = { ...(await ev.action.getSettings()), index: -1 };
			await ev.action.setSettings(updated);
			await this.render(ev.action, updated, "max");
		});
	}


	/** Touch-tap: toggle between the two configured arrangements (A ↔ B).
	 * Serialized with rotations — a tap during a queued spin must not have its
	 * scheme/index overwritten by an in-flight rotation's write. */
	override async onTouchTap(ev: TouchTapEvent<TileSettings>): Promise<void> {
		await serialize(ev.action.id, async () => {
			const settings = await ev.action.getSettings();
			const updated: TileSettings = {
				...settings,
				activeScheme: toggledTileScheme(settings),
				index: -1, // fresh entry: the next turn starts the new arrangement cleanly
			};
			await ev.action.setSettings(updated);
			await this.render(ev.action, updated);
		});
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
