/**
 * Pure logic for the "cycle tmux window" dial: rotate to move between windows,
 * push for last-window, and render a dynamic touchscreen background that
 * reflects the current session/window. All functions are pure (no tmux, no
 * Stream Deck) so they unit test in isolation.
 */

export type WindowDirection = "next" | "prev" | "none";

/** Map a dial rotation to a window step: positive = next, negative = previous. */
export function windowDirection(ticks: number): WindowDirection {
	const t = Math.trunc(ticks);
	if (t > 0) return "next";
	if (t < 0) return "prev";
	return "none";
}

/** tmux args to move to the next/previous window in the current session. */
export function selectWindowDirArgs(direction: Exclude<WindowDirection, "none">): string[] {
	return direction === "next" ? ["next-window"] : ["previous-window"];
}

/** tmux args to toggle to the previously active window (push = back-and-forth). */
export const LAST_WINDOW_ARGS = ["last-window"];

/** tmux args reading the current window as `session|name|index`. */
export const CURRENT_WINDOW_ARGS = [
	"display-message",
	"-p",
	"#{session_name}|#{window_name}|#{window_index}",
];

/** tmux args listing the active flag of each window in the current session. */
export const WINDOW_FLAGS_ARGS = ["list-windows", "-F", "#{window_active}"];

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

function round(n: number): number {
	return Math.round(n * 10) / 10;
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
	const gap = 14;
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
}

/**
 * Build the 200×100 touchscreen image as an SVG string: a session-tinted
 * vertical gradient, faint left/right chevrons hinting the dial rotates, the
 * session name (top) and current window name (centre), and a row of dots
 * showing the window position. Stream Deck layout items may not overlap, so all
 * of this lives in one full-area pixmap. User text is XML-escaped.
 */
export function buildBackgroundSvg(opts: BackgroundOptions): string {
	const { hue, session, window, count, activeIndex } = opts;
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
		`</svg>`
	);
}

/** Encode an SVG string as a data URI usable as a layout pixmap value. */
export function svgToDataUri(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
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
