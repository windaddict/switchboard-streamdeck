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
 * Build the 72×72 key image: a stacked-windows glyph, the window count, and a
 * ring that turns green when the current frontmost window is in the list. Pass
 * `badge: "removed"` to overlay a transient red "−" used as removal feedback.
 */
export function buildRingImage(
	count: number,
	currentInList: boolean,
	badge?: "removed",
): string {
	const ring = currentInList ? "#2ecc71" : "#5a5a5e";
	const label = String(count);
	const fontSize = label.length > 1 ? 24 : 28;
	const removed =
		badge === "removed"
			? `<circle cx="54" cy="19" r="13" fill="#e74c3c" stroke="#1d1d1f" stroke-width="2"/>` +
				`<path d="M47 19h14" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`
			: "";
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" rx="12" fill="#1d1d1f"/>` +
		`<rect x="4" y="4" width="64" height="64" rx="10" fill="none" stroke="${ring}" stroke-width="4"/>` +
		`<rect x="20" y="14" width="24" height="18" rx="3" fill="#3a3a3c" stroke="#7a7a7e" stroke-width="2"/>` +
		`<rect x="28" y="22" width="24" height="18" rx="3" fill="#0a84ff" stroke="#3aa0ff" stroke-width="2"/>` +
		`<text x="36" y="${round(60)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
		`font-size="${fontSize}" font-weight="700" fill="#ffffff">${label}</text>` +
		removed +
		`</svg>`
	);
}
