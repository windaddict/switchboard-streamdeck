/**
 * WHAT IT'S FOR: the one place that draws the "there is a newer way to do
 * this" mark on the three per-agent project keys — Claude Project, Codex
 * Project and Cursor Project — which are superseded by the single AI Project
 * action. Those three faces are built by three separate, near-duplicate SVG
 * builders; putting the mark here means they cannot drift into three slightly
 * different badges.
 *
 * The badge is PURELY COSMETIC. It changes no state, no detection, no
 * behaviour: the three actions keep working exactly as before, and the badge
 * is only a hint to the operator that the key has a replacement. The
 * corresponding words — what to do about it — live in the property inspector
 * banner (`ui/lib/deprecated.js`); a 72×72 key has no room for a sentence.
 *
 * EXPECTED LIFETIME: this module is scaffolding for one deprecation cycle.
 * When the three superseded actions are deleted, delete this file wholesale
 * along with its three call sites — there is nothing here worth keeping.
 */

/**
 * A right-pointing chevron-arrow to overlay on a 72×72 key face, marking the
 * key as superseded. Returns an SVG fragment (not a whole document) to be
 * concatenated into a builder's `<svg>…</svg>`.
 *
 * Placement: the free top-left corner, roughly x 2..8, y 9..15 — clear of the
 * host eyebrow (text centred at x=30 y=15, whose longest label "TERMINAL"
 * starts its ink near x≈8), the state glyph (x 53..69, y 4..21), the project
 * name (centred at x=36 y=40) and the bottom bar (y 57..71). The horizontal
 * extent is deliberately kept tighter than the free box so the longest eyebrow
 * still clears it.
 *
 * Hex colour only — the Stream Deck KEY rasterizer paints `hsl()` as BLACK
 * (documented gotcha; each of the three key-face test files asserts that no
 * `hsl(` literal survives). #6A716E is the muted grey already used for a
 * dimmed project name, so the mark reads as secondary to everything else.
 */
export function deprecationBadge(): string {
	return (
		`<path d="M2.6 12h4.4M4.9 9.8L7.1 12l-2.2 2.2" fill="none" stroke="#6A716E" ` +
		`stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`
	);
}
