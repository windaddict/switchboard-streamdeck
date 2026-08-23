import { describe, expect, it } from "vitest";
import {
	buildSnippetKeyImage,
	MAX_SNIPPET_BYTES,
	previewLines,
	resolveSnippetFace,
	withinSizeCap,
} from "../src/mac/snippet.js";

describe("withinSizeCap", () => {
	it("is exact at the cap: 32768 bytes passes, 32769 fails", () => {
		expect(withinSizeCap("a".repeat(MAX_SNIPPET_BYTES))).toBe(true);
		expect(withinSizeCap("a".repeat(MAX_SNIPPET_BYTES + 1))).toBe(false);
	});

	it("counts BYTES, not characters — multi-byte UTF-8 can exceed the cap under the character count", () => {
		// "🎉" is 4 bytes in UTF-8 but 2 UTF-16 code units (.length counts 2).
		const chars = Math.ceil(MAX_SNIPPET_BYTES / 4) + 10; // well under 32768 *characters*
		const content = "🎉".repeat(chars);
		expect(content.length).toBeLessThan(MAX_SNIPPET_BYTES);
		expect(withinSizeCap(content)).toBe(false);
	});
});

describe("previewLines", () => {
	it("wraps a single long line into 10-char slices across rows, with a trailing ellipsis", () => {
		const content = "abcdefghijklmnopqrstuvwxyz12345"; // 31 chars, no newline
		expect(previewLines(content)).toEqual(["abcdefghij", "klmnopqrst", "uvwxyz123…"]);
	});

	/** Dropping lines silently makes a 200-line snippet look like a 3-line one. */
	it("marks the last row with an ellipsis when lines were dropped", () => {
		expect(previewLines("a\nb\nc")).toEqual(["a", "b", "c"]);
		expect(previewLines("a\nb\nc\nd")).toEqual(["a", "b", "c…"]);
	});

	it("takes the first three non-empty trimmed lines, tabs collapsed to a space", () => {
		const content = "  foo\tbar  \n\nsecond\nthird\nfourth (dropped)";
		// "third…" — the ellipsis is the dropped fourth line being declared.
		expect(previewLines(content)).toEqual(["foo bar", "second", "third…"]);
	});

	it("does not split an astral character when truncating one line among several", () => {
		const rows = previewLines(`${"👍".repeat(20)}\nsecond\nthird`);
		expect(rows[0]).toBe(`${"👍".repeat(9)}…`);
	});

	it("truncates an individual over-wide line (among several) with its own ellipsis", () => {
		const content = "this line is much longer than ten chars\nsecond\nthird";
		expect(previewLines(content)).toEqual(["this line…", "second", "third"]);
	});

	it("returns [] for whitespace-only content", () => {
		expect(previewLines("   \n\t\n  ")).toEqual([]);
		expect(previewLines("")).toEqual([]);
	});

	/** `"👍".length` is 2 in UTF-16, so slicing by width can cut a character in
 * half and paint replacement glyphs on the key. Wrapping counts code points. */
	it("never splits an astral character across wrapped rows", () => {
		const rows = previewLines("👍".repeat(40));
		expect(rows.join("")).not.toContain("\uFFFD");
		for (const row of rows) {
			expect(row).toBe(Array.from(row).join(""));
			expect([...row].every((ch) => ch === "👍" || ch === "…")).toBe(true);
		}
	});

	it("does not add an ellipsis when everything shown is everything there is", () => {
		expect(previewLines("short")).toEqual(["short"]);
		expect(previewLines("one\ntwo")).toEqual(["one", "two"]);
	});
});

describe("resolveSnippetFace", () => {
	it("is empty ONLY when there is no content at all", () => {
		expect(resolveSnippetFace({})).toEqual({ kind: "empty" });
		expect(resolveSnippetFace({ content: "" })).toEqual({ kind: "empty" });
	});

	/** Whitespace is content. The empty face says "hold to teach me", so showing
	 * it for a snippet of spaces or newlines tells the operator the key holds
	 * nothing when in fact pressing it would insert their captured text. */
	it("treats a whitespace-only snippet as taught-but-blank, not untaught", () => {
		expect(resolveSnippetFace({ content: "   " })).toEqual({ kind: "blank", chars: 3 });
		expect(resolveSnippetFace({ content: "\n\n" })).toEqual({ kind: "blank", chars: 2 });
	});

	/** The preview shows the real text whatever its provenance. Captured content
	 * used to default to masked; the operator asked for the text, since a row of
	 * dots answers the wrong question for a key whose job is showing what it
	 * holds. Masking is opt-in per key. */
	/** The operator's over-cap text is never rewritten, so the KEY has to explain
	 * why pressing it does nothing — otherwise an untouched key reads as broken. */
	it("says over-cap rather than previewing content the key will refuse to paste", () => {
		const big = "x".repeat(MAX_SNIPPET_BYTES + 1);
		expect(resolveSnippetFace({ content: big })).toEqual({ kind: "over-cap", bytes: MAX_SNIPPET_BYTES + 1 });
		// Even masked: unusable beats hidden-but-apparently-fine.
		expect(resolveSnippetFace({ content: big, mask: true }).kind).toBe("over-cap");
		const svg = buildSnippetKeyImage(resolveSnippetFace({ content: big }));
		expect(svg).toContain("too big");
		expect(svg).not.toContain("hsl(");
	});

	it("shows the real text by default", () => {
		expect(resolveSnippetFace({ content: "hello" })).toEqual({ kind: "preview", lines: ["hello"] });
	});

	it("masks only when the operator explicitly asks", () => {
		expect(resolveSnippetFace({ content: "hello", mask: true })).toEqual({ kind: "masked", chars: 5 });
		expect(resolveSnippetFace({ content: "hello", mask: false })).toEqual({ kind: "preview", lines: ["hello"] });
	});

	/** Provenance USED to pick the default (captured => masked). It no longer
	 * does — the operator asked to SEE what the key holds — so the face input
	 * no longer carries `source` at all, and an old settings object that still
	 * has one is previewed exactly like any other. */
	it("ignores provenance — a legacy settings object previews normally", () => {
		const legacy = { content: "legacy", source: "captured" } as { content: string };
		expect(resolveSnippetFace(legacy)).toEqual({ kind: "preview", lines: ["legacy"] });
	});
});


describe("buildSnippetKeyImage", () => {
	it("never emits hsl( — the key rasterizer paints it black", () => {
		for (const face of [
			{ kind: "empty" as const },
			{ kind: "preview" as const, lines: ["abc"] },
			{ kind: "masked" as const, chars: 42 },
		]) {
			expect(buildSnippetKeyImage(face)).not.toMatch(/hsl\(/);
		}
	});

	it("XML-escapes user text in the preview face", () => {
		const svg = buildSnippetKeyImage({ kind: "preview", lines: ['<a>&"\''] });
		expect(svg).toContain("&lt;a&gt;&amp;&quot;&apos;");
		expect(svg).not.toContain("<a>&\"'");
	});

	it("the masked face shows the char count and NO substring of the real content", () => {
		const secret = "sk-live-supersecret-token-value";
		const svg = buildSnippetKeyImage({ kind: "masked", chars: secret.length });
		expect(svg).toContain(`${secret.length} ch`);
		expect(svg).not.toContain(secret);
		// Also guard against any accidental partial leak.
		for (let i = 0; i < secret.length - 4; i++) {
			expect(svg).not.toContain(secret.slice(i, i + 5));
		}
	});

	it("the empty face shows the hold-to-teach hint", () => {
		expect(buildSnippetKeyImage({ kind: "empty" })).toContain("hold to teach");
	});
});
