/**
 * Pure logic for the "window ring" dial/key: a user-curated list of windows you
 * tap through. A window is identified by (app, title) — macOS exposes no stable
 * window id via AppleScript, so a window whose title changes can drift out of
 * the ring (documented limitation). Focusing reuses `apps.ts` (activate + raise
 * the window whose title matches); the frontmost window is read via
 * `app-windows.ts` `FRONT_WINDOW_SCRIPT`.
 */

import type { FrontWindow } from "./app-windows.js";

export type RingWindow = FrontWindow; // { app: string; title: string }

/** Two ring entries are the same window when app and title both match. */
export function sameWindow(a: RingWindow, b: RingWindow): boolean {
	return a.app === b.app && a.title === b.title;
}

/** Index of a window in the ring, or -1. */
export function indexOfWindow(list: RingWindow[], w: RingWindow): number {
	return list.findIndex((x) => sameWindow(x, w));
}

/**
 * Toggle a window's membership: remove it if present, otherwise append it.
 * A window with an empty app (no frontmost window) is never added.
 */
export function toggleWindow(
	list: RingWindow[],
	w: RingWindow,
): { list: RingWindow[]; added: boolean } {
	if (!w.app) return { list, added: false };
	const i = indexOfWindow(list, w);
	if (i >= 0) return { list: list.filter((_, idx) => idx !== i), added: false };
	return { list: [...list, w], added: true };
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

function round(n: number): number {
	return Math.round(n * 10) / 10;
}

/**
 * Build the 72×72 key image: a stacked-windows glyph, the window count, and a
 * ring that turns green when the current frontmost window is in the list.
 */
export function buildRingImage(count: number, currentInList: boolean): string {
	const ring = currentInList ? "#2ecc71" : "#5a5a5e";
	const label = String(count);
	const fontSize = label.length > 1 ? 24 : 28;
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" rx="12" fill="#1d1d1f"/>` +
		`<rect x="4" y="4" width="64" height="64" rx="10" fill="none" stroke="${ring}" stroke-width="4"/>` +
		`<rect x="20" y="14" width="24" height="18" rx="3" fill="#3a3a3c" stroke="#7a7a7e" stroke-width="2"/>` +
		`<rect x="28" y="22" width="24" height="18" rx="3" fill="#0a84ff" stroke="#3aa0ff" stroke-width="2"/>` +
		`<text x="36" y="${round(60)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
		`font-size="${fontSize}" font-weight="700" fill="#ffffff">${label}</text>` +
		`</svg>`
	);
}
