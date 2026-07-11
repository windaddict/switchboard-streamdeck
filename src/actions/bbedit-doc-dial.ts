import streamDeck, {
	action,
	type DialAction,
	type DialDownEvent,
	type DialRotateEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { runAppleScript } from "../applescript/runner.js";
import {
	ActiveDocTracker,
	BBEDIT_LIST_SCRIPT,
	type BBEditDoc,
	type BBEditOrder,
	bbeditSelectScript,
	lastDocTarget,
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
 * in the order chosen in the property inspector. Press jumps back to the
 * previously active document (like tmux last-window). The touchscreen shows
 * the active document name.
 */
@action({ UUID: "com.movingavg.switchboard.bbeditdoc" })
export class BBEditDocDial extends SingletonAction<BBEditDocSettings> {
	private readonly trackers = new Map<string, ActiveDocTracker>();

	override async onWillAppear(ev: WillAppearEvent<BBEditDocSettings>): Promise<void> {
		if (!ev.action.isDial()) return;
		const state = await this.readDocs(ev.action);
		if (state === null) return;
		this.tracker(ev.action.id).note(state.activeId);
		await this.render(ev.action, this.activeName(state.docs, state.activeId));
	}

	override onWillDisappear(ev: WillDisappearEvent<BBEditDocSettings>): void {
		this.trackers.delete(ev.action.id);
	}

	override async onDialRotate(ev: DialRotateEvent<BBEditDocSettings>): Promise<void> {
		const direction = rotationDirection(ev.payload.ticks);
		if (direction === "none") return;

		const state = await this.readDocs(ev.action);
		if (state === null) return;
		const tracker = this.tracker(ev.action.id);
		tracker.note(state.activeId); // catch changes made in BBEdit itself

		const ordered = orderedDocs(state.docs, ev.payload.settings.order ?? "window");
		const targetId = nextDocId(ordered, state.activeId, direction);
		if (targetId === null) {
			await this.render(ev.action, "no docs");
			return;
		}
		await this.select(ev.action, targetId, tracker);
	}

	/** Press: jump back to the previously active document. */
	override async onDialDown(ev: DialDownEvent<BBEditDocSettings>): Promise<void> {
		const state = await this.readDocs(ev.action);
		if (state === null) return;
		const tracker = this.tracker(ev.action.id);
		tracker.note(state.activeId);

		const targetId = lastDocTarget(state.docs, state.activeId, tracker.lastActive);
		if (targetId === null) {
			// Nothing to go back to yet — just confirm the current document.
			await this.render(ev.action, this.activeName(state.docs, state.activeId));
			return;
		}
		await this.select(ev.action, targetId, tracker);
	}

	/** Run the list script and parse it; null (already rendered) on failure. */
	private async readDocs(
		dial: DialAction<BBEditDocSettings>,
	): Promise<{ docs: BBEditDoc[]; activeId: number | null } | null> {
		const list = await runAppleScript(BBEDIT_LIST_SCRIPT);
		if (!list.ok) {
			this.logFailure("list", list.code, list.stderr);
			await this.render(dial, this.hint(list.code));
			return null;
		}
		return parseBBEditDocs(list.stdout);
	}

	/** Select a document by id, record it as active, and render the outcome. */
	private async select(
		dial: DialAction<BBEditDocSettings>,
		targetId: number,
		tracker: ActiveDocTracker,
	): Promise<void> {
		const selected = await runAppleScript(bbeditSelectScript(targetId));
		if (!selected.ok) {
			this.logFailure("select", selected.code, selected.stderr);
			await this.render(dial, this.hint(selected.code));
			return;
		}
		tracker.note(targetId);
		await this.render(dial, selected.stdout);
	}

	private tracker(id: string): ActiveDocTracker {
		let t = this.trackers.get(id);
		if (t === undefined) {
			t = new ActiveDocTracker();
			this.trackers.set(id, t);
		}
		return t;
	}

	private activeName(docs: BBEditDoc[], activeId: number | null): string {
		return docs.find((d) => d.id === activeId)?.name ?? "";
	}

	/** Shared mode-dial layout; no ⇄ — this dial has no tap gesture. */
	private async render(dial: DialAction<BBEditDocSettings>, docName: string): Promise<void> {
		try {
			await dial.setFeedback({ mode: "BBEdit", current: docName.trim() || "—" });
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
