import streamDeck, {
	action,
	type DialAction,
	type DialRotateEvent,
	SingletonAction,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import { BBEDIT_CURRENT_DOC_SCRIPT, bbeditCycleDocScript } from "../mac/bbedit.js";
import { rotationDirection } from "../mac/rotation.js";

type BBEditDocSettings = Record<string, never>;

/**
 * Dial action: move back and forth between the documents open in BBEdit's front
 * text window. The touchscreen shows the active document name.
 */
@action({ UUID: "com.johnknox.safarijump.bbeditdoc" })
export class BBEditDocDial extends SingletonAction<BBEditDocSettings> {
	override async onWillAppear(ev: WillAppearEvent<BBEditDocSettings>): Promise<void> {
		if (ev.action.isDial()) {
			const result = await runAppleScript(BBEDIT_CURRENT_DOC_SCRIPT);
			if (!result.ok) {
				streamDeck.logger.warn(`BBEdit read failed (${result.code}): ${result.stderr || "no stderr"}`);
			}
			await this.render(ev.action, result.ok ? result.stdout : this.hint(result.code));
		}
	}

	override async onDialRotate(ev: DialRotateEvent<BBEditDocSettings>): Promise<void> {
		const direction = rotationDirection(ev.payload.ticks);
		if (direction === "none") return;

		const result = await runAppleScript(bbeditCycleDocScript(direction));
		if (!result.ok) {
			streamDeck.logger.error(
				`BBEdit cycle failed (${result.code}): ${result.stderr || "no stderr"}`,
			);
			if (result.code === "permission-denied") {
				streamDeck.logger.error(
					"Grant: System Settings > Privacy & Security > Automation > Stream Deck > enable BBEdit.",
				);
			}
			await this.render(ev.action, this.hint(result.code));
			return;
		}
		await this.render(ev.action, result.stdout);
	}

	/** Short touchscreen hint when a call fails, so the dial isn't silently dead. */
	private hint(code: string): string {
		return code === "permission-denied" ? "grant access" : "no BBEdit?";
	}

	private async render(dial: DialAction<BBEditDocSettings>, docName: string): Promise<void> {
		try {
			await dial.setFeedback({ title: "BBEdit", value: docName.trim() || "—" });
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}
}
