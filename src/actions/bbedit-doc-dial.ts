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
import { describeNothingToDo, describeScriptResult, type DialReport } from "../mac/dial-outcome.js";
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
import { rotationSteps } from "../mac/rotation.js";
import { serialize } from "../mac/serialize.js";
import { reportDial } from "./dial-report.js";

type BBEditDocSettings = {
	/** How the dial traverses documents. Defaults to "window" (natural order). */
	order?: BBEditOrder;
};

/** Result of reading BBEdit's document list: the docs, or the report for the failure. */
type DocsRead =
	| { ok: true; docs: BBEditDoc[]; activeId: number | null }
	| { ok: false; report: DialReport };

/**
 * Dial action: move between the text documents open in BBEdit's front window,
 * in the order chosen in the property inspector. Press jumps back to the
 * previously active document (like tmux last-window). The touchscreen shows
 * the active document name. A failed turn or press (BBEdit not reachable, no
 * Automation grant, a selection that failed, no documents) flashes the dial's
 * alert and logs once, via `reportDial`; appearing is repaint-only, so a failed
 * read there only paints the hint on the strip and never alerts.
 */
@action({ UUID: "com.movingavg.switchboard.bbeditdoc" })
export class BBEditDocDial extends SingletonAction<BBEditDocSettings> {
	private readonly trackers = new Map<string, ActiveDocTracker>();

	override async onWillAppear(ev: WillAppearEvent<BBEditDocSettings>): Promise<void> {
		if (!ev.action.isDial()) return;
		const state = await this.readDocs(ev.action);
		if (!state.ok) return; // hint already painted; appearing never alerts
		this.tracker(ev.action.id).note(state.activeId);
		await this.render(ev.action, this.activeName(state.docs, state.activeId));
	}

	override onWillDisappear(ev: WillDisappearEvent<BBEditDocSettings>): void {
		this.trackers.delete(ev.action.id);
	}

	override async onDialRotate(ev: DialRotateEvent<BBEditDocSettings>): Promise<void> {
		const { direction, steps } = rotationSteps(ev.payload.ticks);
		if (direction === "none") return;

		// Serialized per dial: two overlapping list→select sequences would both
		// read the same active doc and collapse two detents into one move.
		await serialize(ev.action.id, async () => {
			const state = await this.readDocs(ev.action);
			if (!state.ok) {
				await reportDial(ev.action, state.report);
				return;
			}
			const tracker = this.tracker(ev.action.id);
			tracker.note(state.activeId); // catch changes made in BBEdit itself

			const ordered = orderedDocs(state.docs, ev.payload.settings.order ?? "window");
			let activeId = state.activeId;
			for (let i = 0; i < steps; i++) {
				const targetId = nextDocId(ordered, activeId, direction);
				if (targetId === null) {
					await this.render(ev.action, "no docs");
					await reportDial(
						ev.action,
						describeNothingToDo("BBEdit Documents", "no documents open in the front window"),
					);
					return;
				}
				// One failed selection ends the gesture: it was reported once, and the
				// remaining detents would act on a document that never became active.
				if (!(await this.select(ev.action, targetId, tracker))) return;
				activeId = targetId;
			}
		});
	}

	/** Press: jump back to the previously active document. */
	override async onDialDown(ev: DialDownEvent<BBEditDocSettings>): Promise<void> {
		const state = await this.readDocs(ev.action);
		if (!state.ok) {
			await reportDial(ev.action, state.report);
			return;
		}
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

	/** Run the list script and parse it. On failure the strip hint is painted
	 * here and the report is RETURNED, so each caller decides whether the
	 * failure is a gesture (alert) or an appearance (no alert). */
	private async readDocs(dial: DialAction<BBEditDocSettings>): Promise<DocsRead> {
		const list = await runAppleScript(BBEDIT_LIST_SCRIPT);
		if (!list.ok) {
			await this.render(dial, this.hint(list.code));
			return {
				ok: false,
				report: describeScriptResult("BBEdit Documents", list, "automation", "BBEdit"),
			};
		}
		return { ok: true, ...parseBBEditDocs(list.stdout) };
	}

	/** Select a document by id, record it as active, and render the outcome.
	 * Reports a failure itself (alert + one log line) and returns false. */
	private async select(
		dial: DialAction<BBEditDocSettings>,
		targetId: number,
		tracker: ActiveDocTracker,
	): Promise<boolean> {
		const selected = await runAppleScript(bbeditSelectScript(targetId));
		if (!selected.ok) {
			await this.render(dial, this.hint(selected.code));
			await reportDial(dial, describeScriptResult("BBEdit Documents", selected, "automation", "BBEdit"));
			return false;
		}
		tracker.note(targetId);
		await this.render(dial, selected.stdout);
		return true;
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
			await dial.setFeedback({ mode: { value: "BBEdit", color: "#F0A63C" }, current: docName.trim() || "—" });
		} catch (err) {
			streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
		}
	}

	private hint(code: string): string {
		return code === "permission-denied" ? "grant access" : "no BBEdit?";
	}
}
