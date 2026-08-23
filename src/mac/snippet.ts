/**
 * Pure logic for the "Paste Snippet" key: the BUTTON is the storage. Press
 * pastes the stored text at the cursor; holding it (the shared PressGate
 * long-press gesture) copies whatever's currently selected into the key
 * instead; the key face previews what's stored. Everything here is pure (no
 * child_process, no Stream Deck SDK) so the size cap and the face logic are
 * unit-tested in isolation. The actual macOS mechanics live elsewhere:
 * sending ⌘C/⌘V and reading/writing `NSPasteboard` in
 * `clipboard-snippet.ts`, and saving the operator's clipboard before a
 * gesture and putting it back after in `pasteboard-stash.ts`.
 */

import { escapeXml } from "./tmux-window.js";

/** Hard cap on stored snippet size, in BYTES (not characters) — a 32 KiB
 * plaintext blob is already generous for a "paste this" key, and refusing
 * over-cap content is safer than silently truncating it (a truncated paste
 * is a corrupted paste). */
export const MAX_SNIPPET_BYTES = 32_768;

/** True when `content`'s UTF-8 byte length is within {@link MAX_SNIPPET_BYTES}
 * (inclusive). Byte length, not `.length` — a string well under 32,768
 * *characters* can still exceed the cap once multi-byte UTF-8 is counted. */
export function withinSizeCap(content: string): boolean {
	return Buffer.byteLength(content, "utf8") <= MAX_SNIPPET_BYTES;
}

const PREVIEW_MAX_LINES = 3;
const PREVIEW_LINE_WIDTH = 10;

/** Length and slicing in CODE POINTS, not UTF-16 units: `"👍".length` is 2, so a
 * width-based slice can cut an emoji in half and render replacement characters
 * on the key. */
function chars(text: string): string[] {
	return Array.from(text);
}
function cut(text: string, n: number): string {
	return chars(text).slice(0, n).join("");
}

/** Truncate one row to {@link PREVIEW_LINE_WIDTH}, matching the codebase's
 * existing label-truncation convention (`truncate()` in tmux-window.ts):
 * cut to width-1 plus a trailing "…" so the row still signals "there's more"
 * without silently growing past the key face. */
function truncateRow(line: string): string {
	// Code points, like wrapWords — `.length`/`.slice` count UTF-16 units and
	// would cut an emoji in half on the multi-line path.
	return chars(line).length > PREVIEW_LINE_WIDTH ? `${cut(line, PREVIEW_LINE_WIDTH - 1)}…` : line;
}

/**
 * Reduce arbitrary snippet text to up to 3 rows of up to 10 characters each,
 * for the key-face preview. Tabs collapse to a single space and carriage
 * returns are stripped before splitting on "\n"; blank lines are dropped
 * (leading or otherwise) rather than shown as gaps.
 *
 * A single non-empty line with no newlines WRAPS across the available rows
 * (consecutive 10-char slices) instead of being shown once and cut off; if
 * more of it exists than 3 rows can hold, the last row ends in "…". With more
 * than one non-empty line, the first 3 are shown as-is (each individually
 * truncated to the row width, with its own "…" when it didn't fit) — any
 * lines beyond the third are dropped, with the third row ending in "…" so the
 * face never implies the snippet is only as long as what fits.
 *
 * Deterministic: the same input always maps to the same rows, which is what
 * the tests pin down.
 */
export function previewLines(content: string): string[] {
	const normalized = content.replace(/\t/g, " ").replace(/\r/g, "");
	const nonEmpty = normalized
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (nonEmpty.length === 0) return [];

	if (nonEmpty.length === 1) return wrapWords(nonEmpty[0]);

	const shown = nonEmpty.slice(0, PREVIEW_MAX_LINES).map(truncateRow);
	// Say so when lines were dropped. Cutting silently at three rows makes a
	// 200-line snippet look like a 3-line one, and the operator's only cue that
	// the key holds more would be pasting it somewhere to find out.
	if (nonEmpty.length > PREVIEW_MAX_LINES) {
		const last = shown[shown.length - 1];
		shown[shown.length - 1] = last.endsWith("…") ? last : `${cut(last, PREVIEW_LINE_WIDTH - 1).trimEnd()}…`;
	}
	return shown;
}

/**
 * Wrap one line across the key face, breaking at SPACES where it can.
 *
 * Slicing every PREVIEW_LINE_WIDTH characters is simpler but reads badly at key
 * size: "npm run build" became "npm run bu" / "ild", which is harder to
 * recognise at a glance than the text it is previewing. Breaking on words gives
 * "npm run" / "build". A single word longer than the line is still hard-broken
 * — there is nowhere else to break it — and anything past the last line is cut
 * by one character to make room for the ellipsis.
 */
function wrapWords(line: string): string[] {
	const rows: string[] = [];
	let rest = line;
	while (rest.length > 0 && rows.length < PREVIEW_MAX_LINES) {
		if (chars(rest).length <= PREVIEW_LINE_WIDTH) {
			rows.push(rest);
			rest = "";
			break;
		}
		// Prefer the last space that still fits; fall back to a hard break for
		// a single over-long word.
		const window = cut(rest, PREVIEW_LINE_WIDTH + 1);
		const breakAt = chars(window).lastIndexOf(" ");
		const take = breakAt > 0 ? breakAt : PREVIEW_LINE_WIDTH;
		rows.push(cut(rest, take).trimEnd());
		rest = chars(rest).slice(take).join("").trimStart();
	}
	if (rest.length > 0 && rows.length > 0) {
		const last = rows[rows.length - 1];
		rows[rows.length - 1] = `${cut(last, Math.max(0, PREVIEW_LINE_WIDTH - 1)).trimEnd()}…`;
	}
	return rows;
}

/** What the key face renders: nothing captured yet, a plaintext preview, or a
 * masked placeholder that reveals only a character count. */
export type SnippetFace =
	| { kind: "empty" }
	| { kind: "preview"; lines: string[] }
	| { kind: "masked"; chars: number }
	/** Content that is real but has nothing printable to preview (spaces, tabs,
	 * newlines). Distinct from `empty`, which means the key holds NOTHING: this
	 * face has to say "taught, but invisible" or the operator reads a taught key
	 * as untaught and re-teaches it over a snippet they meant to keep. */
	| { kind: "blank"; chars: number }
	/** Stored content exceeds {@link MAX_SNIPPET_BYTES}. The key refuses to use
	 * it — but the operator's text is never rewritten or truncated, so the face
	 * has to TELL them why the key is inert, or an untouched key reads as
	 * broken. */
	| { kind: "over-cap"; bytes: number };

/** The subset of settings {@link resolveSnippetFace} needs. `PasteSnippetSettings`
 * (in the action shell) is a structural superset of this. */
export interface SnippetFaceSettings {
	content?: string;
	mask?: boolean;
}

/**
 * Which face this key should paint.
 *
 * Empty content shows the teach hint. Otherwise the real text is previewed —
 * that is the point of the key face, and it is what the operator asked for.
 * `mask` replaces it with dots plus a character count for keys that hold
 * something they would rather not have readable across the room; it is opt-in
 * and applies whether the text was captured or typed. Provenance (`source` on
 * the action's settings) deliberately plays no part — see the note there.
 */
export function resolveSnippetFace(settings: SnippetFaceSettings): SnippetFace {
	const content = settings.content ?? "";
	// Checked before anything else: an over-cap snippet is unusable whether or
	// not it is masked, and the face must say so rather than preview text the
	// key will refuse to paste.
	if (!withinSizeCap(content)) return { kind: "over-cap", bytes: Buffer.byteLength(content, "utf8") };
	// Only genuinely absent content shows the teach hint. A snippet of spaces
	// or newlines is real text the operator captured on purpose — showing the
	// "hold to teach" face for it would claim the key is untaught when it is not.
	if (content === "") return { kind: "empty" };
	// The preview shows the real text by default, whatever its provenance.
	// Captured text used to default to MASKED on the theory that an accidental
	// capture shouldn't be readable on a desk device — but the operator's whole
	// reason for a preview is seeing what the key holds, and a row of dots
	// answers the wrong question. Masking is now opt-in per key.
	const masked = settings.mask ?? false;
	if (masked) return { kind: "masked", chars: content.length };
	const lines = previewLines(content);
	// Whitespace-only content previews as no rows at all. Painting that would
	// give a blank key indistinguishable from a broken one.
	if (lines.length === 0) return { kind: "blank", chars: content.length };
	return { kind: "preview", lines };
}

const INK = "#0F1211";
const TEAL = "#3EC9C4"; // files family, matching Open File's jack-line
const SIGNAL = "#F2FFF6";
const MUTED = "#8B9490";
const WARN = "#E8B14C"; // the amber used for "needs you" elsewhere on the deck
const PREVIEW_ROW_Y = [22, 36, 50];
// A FIXED bullet string, never derived from the real content — the masked
// face must not leak line count, line length, or anything else about what's
// stored, only the character count printed below it.
const MASK_ROW = "••••••••••";

function jackLine(): string {
	return `<rect x="8" y="62.5" width="56" height="3.5" rx="1.75" fill="${TEAL}" opacity="0.95"/>`;
}

/** A dimmed clipboard outline, used for the empty face. */
function clipboardGlyph(color: string): string {
	return (
		// Sized to end well above the hint's baseline (y=53). The first version ran to
		// y=52 and the hint printed straight through it.
		`<rect x="24" y="12" width="24" height="28" rx="4" fill="none" stroke="${color}" stroke-width="3"/>` +
		`<rect x="30" y="8" width="12" height="6" rx="2" fill="${color}"/>`
	);
}

/**
 * Build the 72×72 key-face SVG for the given face. Hex colours only — the
 * KEY rasterizer (unlike the touchscreen pixmap pipeline) paints `hsl()` as
 * solid black. Any real snippet text (the preview lines) is XML-escaped;
 * the masked face never touches the real content at all, by construction.
 */
export function buildSnippetKeyImage(face: SnippetFace): string {
	let body: string;
	if (face.kind === "empty") {
		body =
			clipboardGlyph(MUTED) +
			`<text x="36" y="53" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
			`font-size="9" fill="${MUTED}">hold to teach</text>`;
	} else if (face.kind === "masked") {
		const rows = PREVIEW_ROW_Y.map(
			(y) =>
				`<text x="36" y="${y}" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
				`font-size="10" fill="${SIGNAL}">${MASK_ROW}</text>`,
		).join("");
		body =
			rows +
			`<text x="36" y="60" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
			`font-size="8" fill="${MUTED}">${face.chars} ch</text>`;
	} else if (face.kind === "over-cap") {
		body =
			`<text x="36" y="30" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
			`font-size="10" fill="${WARN}">too big</text>` +
			`<text x="36" y="44" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
			`font-size="9" fill="${MUTED}">${Math.round(face.bytes / 1024)} KB</text>` +
			`<text x="36" y="57" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
			`font-size="8" fill="${MUTED}">shorten it</text>`;
	} else if (face.kind === "blank") {
		body =
			clipboardGlyph(TEAL) +
			`<text x="36" y="53" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
			`font-size="8" fill="${MUTED}">whitespace · ${face.chars} ch</text>`;
	} else {
		body = face.lines
			.map(
				(line, i) =>
					`<text x="36" y="${PREVIEW_ROW_Y[i]}" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
					`font-size="10" fill="${SIGNAL}">${escapeXml(line)}</text>`,
			)
			.join("");
	}
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" fill="${INK}"/>${body}${jackLine()}</svg>`
	);
}

