/**
 * Pure logic for the "cycle tmux window" dial: rotate to move between windows,
 * push for last-window, and render a dynamic touchscreen background that
 * reflects the current session/window. All functions are pure (no tmux, no
 * Stream Deck) so they unit test in isolation.
 */

import type { RotationDirection } from "./rotation.js";
import { round, svgToDataUri } from "./svg.js";
import type { TmuxWindow } from "./tmux.js";

/** What the dial rotation moves through: the current session or every session. */
export type TmuxScope = "session" | "all";

/** Toggle the dial's scope (touch-tap). */
export function toggleScope(scope: TmuxScope): TmuxScope {
	return scope === "session" ? "all" : "session";
}

/**
 * tmux args to move to the next/previous window. Untargeted, tmux acts on its
 * own "current" session; pass `session` to scope to the session actually in
 * the frontmost macOS window.
 */
export function selectWindowDirArgs(
	direction: Exclude<RotationDirection, "none">,
	session?: string | null,
): string[] {
	const base = direction === "next" ? ["next-window"] : ["previous-window"];
	return session ? [...base, "-t", session] : base;
}

/** tmux args to toggle to the previously active window of `session`
 * (push = back-and-forth). */
export function lastWindowArgs(session: string): string[] {
	return ["last-window", "-t", session];
}

/** tmux args to toggle the given CLIENT to its previously active session
 * (push in "all" scope). Scoped with -c so a background client never moves. */
export function lastSessionArgs(clientTty: string): string[] {
	return ["switch-client", "-c", clientTty, "-l"];
}

/**
 * The window a rotation should land on in "all" scope: the neighbour of the
 * current window in the flattened all-sessions list (wrapping across session
 * boundaries). Falls back to the first window when the current one isn't in
 * the list; null only for an empty list.
 */
export function nextWindowAcross(
	windows: TmuxWindow[],
	current: CurrentWindow,
	direction: Exclude<RotationDirection, "none">,
): TmuxWindow | null {
	const n = windows.length;
	if (n === 0) return null;
	const idx = windows.findIndex((w) => w.session === current.session && w.index === current.index);
	if (idx < 0) return windows[0];
	const target = direction === "next" ? (idx + 1) % n : (idx - 1 + n) % n;
	return windows[target];
}

/**
 * tmux args that jump a client to a window in ANY session.
 * `switch-client -t sess:idx` changes session and window in one step
 * (`select-window` alone cannot leave the current session). Pass the front
 * client's tty as `clientTty` — untargeted, tmux moves ITS "current client",
 * which can be a background terminal.
 */
export function switchToWindowArgs(w: TmuxWindow, clientTty?: string | null): string[] {
	const target = ["-t", `${w.session}:${w.index}`];
	return clientTty
		? ["switch-client", "-c", clientTty, ...target]
		: ["switch-client", ...target];
}

const CURRENT_WINDOW_FORMAT = "#{session_name}|#{window_name}|#{window_index}";

/** tmux args reading the current window as `session|name|index`. */
export const CURRENT_WINDOW_ARGS = ["display-message", "-p", CURRENT_WINDOW_FORMAT];

/** {@link CURRENT_WINDOW_ARGS} scoped to a session's active window. */
export function currentWindowArgs(session: string): string[] {
	return ["display-message", "-p", "-t", session, CURRENT_WINDOW_FORMAT];
}

/** tmux args listing the active flag of each window in the given session
 * (untargeted when omitted — tmux's own "current" session). */
export function windowFlagsArgs(session?: string | null): string[] {
	const base = ["list-windows", "-F", "#{window_active}"];
	return session ? [...base, "-t", session] : base;
}

export interface CurrentWindow {
	session: string;
	name: string;
	index: number;
}

/** Parse `session|name|index` into a {@link CurrentWindow}. */
export function parseCurrentWindow(output: string): CurrentWindow {
	const [session = "", name = "", index = "0"] = output.trim().split("|");
	return { session, name, index: Number.parseInt(index, 10) || 0 };
}

/**
 * "Teach the button": the Focus-tmux target string for a captured current
 * window, in the same `session:name` form the dropdown persists. "" (nothing
 * to save) when the session is blank — i.e. no tmux server was running.
 */
export function captureTmuxTarget(current: CurrentWindow): string {
	if (current.session.trim() === "") return "";
	return `${current.session}:${current.name}`;
}

/** Parse the per-window active flags ("1" = active) preserving window order. */
export function parseActiveFlags(output: string): boolean[] {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "")
		.map((line) => line === "1");
}

/** Deterministic 0–359 hue derived from a session name, so colours are stable. */
export function sessionHue(session: string): number {
	let h = 0;
	for (let i = 0; i < session.length; i++) {
		h = (h * 31 + session.charCodeAt(i)) % 360;
	}
	return h;
}

/** Escape text for safe embedding inside SVG/XML. */
export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Row of position dots; the active window's dot is larger and brighter. */
function dotsSvg(count: number, activeIndex: number, hue: number): string {
	if (count <= 0) return "";
	// Shrink the gap when many windows must fit (all-sessions scope) so the
	// row never overflows the 200px strip.
	const gap = count > 1 ? Math.min(14, 180 / (count - 1)) : 14;
	const startX = 100 - ((count - 1) * gap) / 2;
	const y = 86;
	let out = "";
	for (let i = 0; i < count; i++) {
		const cx = round(startX + i * gap);
		const active = i === activeIndex;
		const r = active ? 4 : 2.5;
		const fill = active ? `hsl(${hue},70%,78%)` : `hsl(${hue},30%,45%)`;
		out += `<circle cx="${cx}" cy="${y}" r="${r}" fill="${fill}"/>`;
	}
	return out;
}

/** Truncate a label so it fits the 200px touch strip. */
function truncate(value: string, max = 16): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export interface BackgroundOptions {
	hue: number;
	session: string;
	window: string;
	count: number;
	activeIndex: number;
	/** Small top-right scope tag, e.g. "ALL" when cycling every session. */
	badge?: string;
}

/**
 * Build the 200×100 touchscreen image as an SVG string: a session-tinted
 * vertical gradient, faint left/right chevrons hinting the dial rotates, the
 * session name (top) and current window name (centre), and a row of dots
 * showing the window position. Stream Deck layout items may not overlap, so all
 * of this lives in one full-area pixmap. User text is XML-escaped.
 */
export function buildBackgroundSvg(opts: BackgroundOptions): string {
	const { hue, session, window, count, activeIndex, badge } = opts;
	const badgeSvg = badge
		? `<text x="192" y="17" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1" fill="hsl(${hue},60%,85%)" opacity="0.9">${escapeXml(badge)}</text>`
		: "";
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">` +
		`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
		`<stop offset="0" stop-color="hsl(${hue},55%,24%)"/>` +
		`<stop offset="1" stop-color="hsl(${hue},60%,10%)"/>` +
		`</linearGradient></defs>` +
		`<rect width="200" height="100" fill="url(#g)"/>` +
		`<path d="M14 50l-7 6 7 6" fill="none" stroke="hsl(${hue},45%,72%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` +
		`<path d="M186 50l7 6-7 6" fill="none" stroke="hsl(${hue},45%,72%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` +
		`<text x="100" y="24" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1.5" fill="hsl(${hue},45%,76%)">${escapeXml(truncate(session.toUpperCase(), 20))}</text>` +
		`<text x="100" y="60" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${escapeXml(truncate(window))}</text>` +
		dotsSvg(count, activeIndex, hue) +
		badgeSvg +
		`</svg>`
	);
}

/** setFeedback payload: a single full-area pixmap keyed `bg` in the layout. */
export type WindowFeedback = { bg: string };

/** Build the setFeedback payload for the current window + window flags. */
export function buildWindowFeedback(current: CurrentWindow, flags: boolean[]): WindowFeedback {
	const svg = buildBackgroundSvg({
		hue: sessionHue(current.session),
		session: current.session,
		window: current.name,
		count: flags.length,
		activeIndex: flags.indexOf(true),
	});
	return { bg: svgToDataUri(svg) };
}

/**
 * setFeedback payload for "all" scope: the dots span every window of every
 * session (current window highlighted) and an ALL badge marks the scope.
 */
export function buildAllWindowsFeedback(
	windows: TmuxWindow[],
	current: CurrentWindow,
): WindowFeedback {
	const svg = buildBackgroundSvg({
		hue: sessionHue(current.session),
		session: current.session,
		window: current.name,
		count: windows.length,
		activeIndex: windows.findIndex(
			(w) => w.session === current.session && w.index === current.index,
		),
		badge: "ALL",
	});
	return { bg: svgToDataUri(svg) };
}
