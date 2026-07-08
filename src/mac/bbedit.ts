/**
 * Pure logic for the BBEdit document dial: move between the text documents open
 * in BBEdit's front window, in a user-chosen traversal order. We cycle `text
 * documents` (not `documents`) so non-editor project/folder items that show
 * "(no editor)" are skipped.
 *
 * The ordering/selection is done here in TypeScript (testable): AppleScript
 * lists the docs with sort keys (`BBEDIT_LIST_SCRIPT`), this module orders them
 * and picks the target, then AppleScript selects it by its stable `id`
 * (`bbeditSelectScript`). Scripts interpolate only numeric ids, so there is
 * nothing to escape.
 */

import type { RotationDirection } from "./rotation.js";

/** How the dial traverses the documents. */
export type BBEditOrder = "window" | "alpha" | "recent" | "oldest";

export interface BBEditDoc {
	id: number;
	name: string;
	/** modification date as seconds since the 1970 epoch (local) — for sorting. */
	modSeconds: number;
}

/**
 * AppleScript that lists the front window's text documents, one per line as
 * `id<tab>name<tab>modSeconds`, then a final `ACTIVE<tab>id` line for the active
 * document. Returns "" when there is no text window.
 */
export const BBEDIT_LIST_SCRIPT = `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	set w to text window 1
	set theDocs to text documents of w
	set epoch to current date
	set day of epoch to 1
	set month of epoch to January
	set year of epoch to 1970
	set time of epoch to 0
	set out to ""
	repeat with d in theDocs
		set out to out & (id of d) & tab & (name of d) & tab & ((modification date of d) - epoch) & linefeed
	end repeat
	try
		set out to out & "ACTIVE" & tab & (id of active document of w)
	end try
	return out
end tell`;

/** Parse `BBEDIT_LIST_SCRIPT` output into docs + the active document id. */
export function parseBBEditDocs(output: string): { docs: BBEditDoc[]; activeId: number | null } {
	const docs: BBEditDoc[] = [];
	let activeId: number | null = null;

	for (const line of output.split("\n")) {
		if (line.trim() === "") continue;
		const parts = line.split("\t");
		if (parts[0] === "ACTIVE") {
			const id = Number.parseInt(parts[1] ?? "", 10);
			activeId = Number.isFinite(id) ? id : null;
			continue;
		}
		if (parts.length < 3) continue;
		const id = Number.parseInt(parts[0] ?? "", 10);
		if (!Number.isFinite(id)) continue;
		const modSeconds = Number(parts[parts.length - 1]);
		const name = parts.slice(1, parts.length - 1).join("\t");
		docs.push({ id, name, modSeconds: Number.isFinite(modSeconds) ? modSeconds : 0 });
	}

	return { docs, activeId };
}

/** Order the documents by the chosen traversal mode (window = natural order). */
export function orderedDocs(docs: BBEditDoc[], order: BBEditOrder): BBEditDoc[] {
	const arr = [...docs];
	switch (order) {
		case "alpha":
			return arr.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
		case "recent":
			return arr.sort((a, b) => b.modSeconds - a.modSeconds || a.id - b.id);
		case "oldest":
			return arr.sort((a, b) => a.modSeconds - b.modSeconds || a.id - b.id);
		default:
			return arr;
	}
}

/**
 * Given docs already in traversal order, return the id of the next/previous
 * document relative to `activeId` (wrapping). If the active document isn't in
 * the set, jump to the first. Returns null only for an empty list.
 */
export function nextDocId(
	ordered: BBEditDoc[],
	activeId: number | null,
	direction: Exclude<RotationDirection, "none">,
): number | null {
	const n = ordered.length;
	if (n === 0) return null;
	const idx = ordered.findIndex((d) => d.id === activeId);
	if (idx < 0) return ordered[0].id;
	const target = direction === "next" ? (idx + 1) % n : (idx - 1 + n) % n;
	return ordered[target].id;
}

/**
 * Remembers the previously active document so a dial press can jump back to it.
 * Feed every observed active id through {@link note}; `lastActive` is the id
 * that was active before the most recent change (never the current one).
 */
export class ActiveDocTracker {
	private current: number | null = null;
	private previous: number | null = null;

	note(activeId: number | null): void {
		if (activeId === null || activeId === this.current) return;
		this.previous = this.current;
		this.current = activeId;
	}

	get lastActive(): number | null {
		return this.previous;
	}
}

/**
 * The document a press should jump back to: the remembered id, provided it is
 * not the active document and is still open. Returns null when there is no
 * valid "previous" to go to (caller treats that as a no-op).
 */
export function lastDocTarget(
	docs: BBEditDoc[],
	activeId: number | null,
	remembered: number | null,
): number | null {
	if (remembered === null || remembered === activeId) return null;
	return docs.some((d) => d.id === remembered) ? remembered : null;
}

/** AppleScript that selects the front window's text document with the given id. */
export function bbeditSelectScript(id: number): string {
	return `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	set w to text window 1
	try
		select (first text document of w whose id is ${id})
		return name of active document of w
	on error
		return ""
	end try
end tell`;
}
