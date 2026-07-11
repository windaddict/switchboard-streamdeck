/**
 * Pure logic for the "window ring" dial/key: a user-curated list of windows you
 * tap through. A window is identified by (app, title) — macOS exposes no stable
 * window id via AppleScript, so a window whose title changes can drift out of
 * the ring (documented limitation). Focusing reuses `apps.ts` (activate + raise
 * the window whose title matches); the frontmost window is read via
 * `app-windows.ts` `FRONT_WINDOW_SCRIPT`.
 */

import type { FrontWindow } from "./app-windows.js";
import { round } from "./svg.js";

export type RingWindow = FrontWindow; // { app: string; title: string }

/** Two ring entries are the same window when app and title both match. */
export function sameWindow(a: RingWindow, b: RingWindow): boolean {
	return a.app === b.app && a.title === b.title;
}

/** Index of a window in the ring, or -1. */
export function indexOfWindow(list: RingWindow[], w: RingWindow): number {
	return list.findIndex((x) => sameWindow(x, w));
}

export type ToggleOutcome = "added" | "removed" | "noop";

/**
 * Classify what a long-press does to the ring: remove the window if present,
 * add it if new, or no-op when there's no frontmost window (empty app). Returns
 * the resulting list, the outcome, and the index removed (-1 otherwise) so the
 * caller can keep the round-robin cursor consistent.
 */
export function classifyToggle(
	list: RingWindow[],
	w: RingWindow,
): { list: RingWindow[]; outcome: ToggleOutcome; removedIndex: number } {
	if (!w.app) return { list, outcome: "noop", removedIndex: -1 };
	const i = indexOfWindow(list, w);
	if (i >= 0) {
		return { list: list.filter((_, idx) => idx !== i), outcome: "removed", removedIndex: i };
	}
	return { list: [...list, w], outcome: "added", removedIndex: -1 };
}

/** Keep the cursor pointing at a sensible slot after a window is removed. */
export function adjustCursorAfterRemoval(cursor: number, removedIndex: number): number {
	if (removedIndex < 0) return cursor;
	return cursor >= removedIndex ? cursor - 1 : cursor;
}

/**
 * Toggle a window's membership (thin wrapper over {@link classifyToggle}).
 * A window with an empty app (no frontmost window) is never added.
 */
export function toggleWindow(
	list: RingWindow[],
	w: RingWindow,
): { list: RingWindow[]; added: boolean } {
	const { list: next, outcome } = classifyToggle(list, w);
	return { list: next, added: outcome === "added" };
}

/**
 * Next cursor position (round-robin). A cursor of -1 (or non-integer) yields 0,
 * so the first tap lands on the first window. Negative values wrap correctly.
 */
export function nextIndex(len: number, cursor: number): number {
	if (len <= 0) return 0;
	const c = Number.isInteger(cursor) ? cursor : -1;
	return (((c + 1) % len) + len) % len;
}

/**
 * Build the 72×72 key image on the shared design system (ink ground, azure
 * family, jack-line): the ring itself carries the state — a solid azure
 * circle when the frontmost window is in the list, a muted dotted one when
 * not (matching the action's static icon) — with the window pair and count
 * inside. Pass `badge: "removed"` to overlay a transient red "−" used as
 * removal feedback. Hex colours only: the key rasterizer paints hsl() black.
 */
export function buildRingImage(
	count: number,
	currentInList: boolean,
	badge?: "removed",
): string {
	const ring = currentInList
		? `stroke="#4E9CFF"`
		: `stroke="#5A615E" stroke-dasharray="1 6" stroke-linecap="round"`;
	const label = String(count);
	const fontSize = label.length > 1 ? 17 : 20;
	const removed =
		badge === "removed"
			? `<circle cx="54" cy="18" r="12" fill="#E5484D" stroke="#0F1211" stroke-width="2"/>` +
				`<path d="M48 18h12" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`
			: "";
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" fill="#0F1211"/>` +
		`<rect x="8" y="62.5" width="56" height="3.5" rx="1.75" fill="#4E9CFF" opacity="0.95"/>` +
		`<circle cx="36" cy="31" r="23" fill="none" stroke-width="3" ${ring}/>` +
		`<rect x="24" y="16" width="20" height="14" rx="2" fill="#0F1211" stroke="#8B9490" stroke-width="2.5"/>` +
		`<rect x="30" y="23" width="20" height="14" rx="2" fill="#4E9CFF"/>` +
		`<text x="36" y="${round(53)}" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
		`font-size="${fontSize}" font-weight="700" fill="#F2FFF6">${label}</text>` +
		removed +
		`</svg>`
	);
}
