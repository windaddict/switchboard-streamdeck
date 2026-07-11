/**
 * Live key face for Focus tmux Window: a miniature tmux pane whose bottom
 * status bar lights up — with a block cursor — exactly when the button's tmux
 * window would receive keyboard input (active window of its session, that
 * session's client tty is iTerm's focused session, and iTerm is the frontmost
 * app). Pure: state evaluation and SVG rendering only; the action supplies
 * the queried inputs and turns the SVG into a data URI.
 */

import type { ClaudeState } from "./claude-state.js";
import { hslToHex } from "./svg.js";
import { resolveTarget, type TmuxWindow } from "./tmux.js";
import { escapeXml, sessionHue } from "./tmux-window.js";

/** hot = keystrokes land there now; cold = exists but unfocused; unknown = no match/server. */
export type TmuxKeyState = "hot" | "cold" | "unknown";

export interface TmuxKeyStatus {
	state: TmuxKeyState;
	session: string;
	window: string;
}

/**
 * Decide the key's state from the polled facts. The hot chain requires every
 * link: the target resolves, it is the ACTIVE window of its session, that
 * session has an attached client tty, iTerm is frontmost, and iTerm's focused
 * session sits on that exact tty (an unfocused split pane fails this —
 * correctly, since keystrokes would not go there).
 */
export function evaluateKeyStatus(args: {
	windows: TmuxWindow[];
	clients: Map<string, string>;
	target: string;
	iTermFrontmost: boolean;
	/** tty of iTerm's focused session; "" when unknown or iTerm not frontmost. */
	focusedTty: string;
}): TmuxKeyStatus {
	const match = resolveTarget(args.windows, args.target);
	if (!match) {
		return { state: "unknown", session: "", window: args.target.trim() };
	}
	const tty = args.clients.get(match.session) ?? "";
	const hot =
		match.active && args.iTermFrontmost && tty !== "" && tty === args.focusedTty;
	return { state: hot ? "hot" : "cold", session: match.session, window: match.name };
}

const MONO = "Menlo, Monaco, monospace";

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Render the 72×72 key SVG. The bottom strip is the tmux status bar: lit in
 * the session's hue with a block cursor when hot, a hollow outline when cold,
 * a gray dashed outline when the target can't be resolved. Session name is a
 * small uppercase eyebrow, window name the mono centerpiece. User text is
 * XML-escaped.
 */
export function buildTmuxKeyImage(
	status: TmuxKeyStatus,
	claude: ClaudeState = "none",
	/** Poll tick counter — the working spark rotates a step per tick. */
	spin = 0,
): string {
	const hue = sessionHue(status.session);
	const name = truncate(status.window || (status.state === "unknown" ? "no target" : "—"), 9);
	// 10 chars keeps the centered eyebrow clear of the Claude spark's corner.
	const session = truncate(status.session.toUpperCase(), 10);

	let bar: string;
	let nameFill: string;
	let sessionText = "";
	let glyphStroke: string;

	// Stream Deck's KEY rasterizer paints hsl() literals as BLACK (the
	// touchscreen pipeline accepts them) — every colour here must be hex.
	if (status.state === "hot") {
		bar =
			`<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">` +
			`<stop offset="0" stop-color="${hslToHex(hue, 62, 46)}"/>` +
			`<stop offset="1" stop-color="${hslToHex(hue, 66, 36)}"/>` +
			`</linearGradient></defs>` +
			`<rect x="0" y="57" width="72" height="15" fill="url(#b)"/>` +
			`<rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`;
		nameFill = "#FFFFFF";
		sessionText = hslToHex(hue, 55, 72);
		glyphStroke = "#F2FFF6";
	} else if (status.state === "cold") {
		bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
		nameFill = "#A6ADA9";
		sessionText = hslToHex(hue, 50, 70);
		glyphStroke = hslToHex(hue, 50, 70);
	} else {
		bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="#6A716E" stroke-width="1.5" stroke-dasharray="3 3"/>`;
		nameFill = "#8B9490";
		glyphStroke = "#8B9490";
	}

	// tmux identity mark: a tiny split-pane window at the bar's left end (where
	// tmux puts its session block) — present in every state so the key reads as
	// a tmux button even when idle; on hot it bookends the cursor. Attributes
	// go DIRECTLY on each element: Stream Deck's SVG rasterizer does not
	// reliably inherit presentation attributes from a <g> wrapper (the glyph
	// rendered as an invisible black-filled rect when they lived on the group).
	const glyph =
		`<rect x="5.5" y="60.5" width="9" height="8" rx="1" fill="none" stroke="${glyphStroke}" stroke-width="1.6"/>` +
		`<path d="M10 60.5v8" fill="none" stroke="${glyphStroke}" stroke-width="1.6"/>`;

	const eyebrow = session
		? `<text x="36" y="15" text-anchor="middle" font-family="${MONO}" font-size="7.5" letter-spacing="1.2" fill="${sessionText}">${escapeXml(session)}</text>`
		: "";

	// Claude Code spark (top-right): amber and slowly rotating while WORKING,
	// still signal-white when finished and WAITING for input, absent when no
	// claude runs in the window. Drawn as paths — no font-fallback risk.
	let spark = "";
	if (claude !== "none") {
		const color = claude === "working" ? "#F0A63C" : "#F2FFF6";
		const angle = claude === "working" ? (spin % 12) * 30 : 0;
		spark =
			`<path d="M56 12h10M58.5 7.7l5 8.6M63.5 7.7l-5 8.6" ` +
			`stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none" ` +
			`transform="rotate(${angle} 61 12)"/>`;
	}

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" fill="#0F1211"/>` +
		eyebrow +
		spark +
		`<text x="36" y="40" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>` +
		bar +
		glyph +
		`</svg>`
	);
}
