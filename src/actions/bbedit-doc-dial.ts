import streamDeck, {
	action,
	type DialAction,
	type DialRotateEvent,
	SingletonAction,
	type WillAppearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import {
	BBEDIT_CURRENT_DOC_SCRIPT,
	BBEDIT_LIST_SCRIPT,
	type BBEditOrder,
	bbeditSelectScript,
	nextDocId,
	orderedDocs,
	parseBBEditDocs,
} from "../mac/bbedit.js";
import { rotationDirection } from "../mac/rotation.js";

type BBEditDocSettings = {
	/** How the dial traverses documents. Defaults to "window" (natural order). */
	order?: BBEditOrder;
};

/**
 * Dial action: move between the text documents open in BBEdit's front window,
 * in the order chosen in the property inspector. The touchscreen shows the
 * active document name.
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

		const list = await runAppleScript(BBEDIT_LIST_SCRIPT);
		if (!list.ok) {
			this.logFailure("list", list.code, list.stderr);
			await this.render(ev.action, this.hint(list.code));
			return;
		}

		const { docs, activeId } = parseBBEditDocs(list.stdout);
		const ordered = orderedDocs(docs, ev.payload.settings.order ?? "window");
		const targetId = nextDocId(ordered, activeId, direction);
		if (targetId === null) {
			await this.render(ev.action, "no docs");
			return;
		}

		const selected = await runAppleScript(bbeditSelectScript(targetId));
		if (!selected.ok) {
			this.logFailure("select", selected.code, selected.stderr);
			await this.render(ev.action, this.hint(selected.code));
			return;
		}
		await this.render(ev.action, selected.stdout);
	}

	private async render(dial: DialAction<BBEditDocSettings>, docName: string): Promise<void> {
		try {
			await dial.setFeedback({ title: "BBEdit", value: docName.trim() || "—" });
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}

	private logFailure(stage: string, code: string, stderr: string): void {
		streamDeck.logger.error(`BBEdit ${stage} failed (${code}): ${stderr || "no stderr"}`);
		if (code === "permission-denied") {
			streamDeck.logger.error(
				"Grant: System Settings > Privacy & Security > Automation > Stream Deck > enable BBEdit.",
			);
		}
	}

	private hint(code: string): string {
		return code === "permission-denied" ? "grant access" : "no BBEdit?";
	}
}
