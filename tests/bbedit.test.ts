import { describe, it, expect } from "vitest";
import {
	ActiveDocTracker,
	BBEDIT_LIST_SCRIPT,
	type BBEditDoc,
	bbeditSelectScript,
	lastDocTarget,
	nextDocId,
	orderedDocs,
	parseBBEditDocs,
} from "../src/mac/bbedit.js";

describe("scripts", () => {
	it("list script uses text documents (skips non-editor items) and an ACTIVE marker", () => {
		expect(BBEDIT_LIST_SCRIPT).toContain("text documents of w");
		expect(BBEDIT_LIST_SCRIPT).not.toContain("set theDocs to documents of w");
		expect(BBEDIT_LIST_SCRIPT).toContain('"ACTIVE"');
		expect(BBEDIT_LIST_SCRIPT).toContain("modification date");
	});
	it("select script selects by stable id and returns the new active name", () => {
		const s = bbeditSelectScript(45);
		expect(s).toContain("first text document of w whose id is 45");
		expect(s).toContain("return name of active document of w");
	});
});

const LIST = "45\tvoice-of-the-customer.md\t1716579276\n12\tabout.md\t1716000000\n7\tzeta.md\t1716999999\nACTIVE\t12\n";

describe("parseBBEditDocs", () => {
	it("parses id/name/modSeconds rows and the active id", () => {
		const { docs, activeId } = parseBBEditDocs(LIST);
		expect(activeId).toBe(12);
		expect(docs).toHaveLength(3);
		expect(docs[0]).toEqual({ id: 45, name: "voice-of-the-customer.md", modSeconds: 1716579276 });
	});
	it("keeps tabs inside a name (id first, modSeconds last)", () => {
		const { docs } = parseBBEditDocs("9\tweird\tname.md\t100\n");
		expect(docs[0]).toEqual({ id: 9, name: "weird\tname.md", modSeconds: 100 });
	});
	it("parses AppleScript scientific-notation mod times", () => {
		// AppleScript renders large numbers like 1.782578524E+9
		const { docs } = parseBBEditDocs("106\tessay.md\t1.782578524E+9\n");
		expect(docs[0].modSeconds).toBe(1782578524);
	});
	it("tolerates empty output", () => {
		expect(parseBBEditDocs("")).toEqual({ docs: [], activeId: null });
	});
	it("skips malformed/short rows and rows with a non-numeric id", () => {
		const { docs, activeId } = parseBBEditDocs(
			"45\tgood.md\t100\nshort-row\nx\tbad-id.md\t50\nACTIVE\t45\n",
		);
		expect(docs.map((d) => d.id)).toEqual([45]); // only the well-formed numeric-id row
		expect(activeId).toBe(45);
	});
	it("defaults a non-finite modSeconds to 0", () => {
		const { docs } = parseBBEditDocs("9\tweird.md\tnotanumber\n");
		expect(docs[0]).toEqual({ id: 9, name: "weird.md", modSeconds: 0 });
	});
});

const docs: BBEditDoc[] = [
	{ id: 45, name: "voice.md", modSeconds: 300 },
	{ id: 12, name: "about.md", modSeconds: 100 },
	{ id: 7, name: "zeta.md", modSeconds: 200 },
];

describe("orderedDocs", () => {
	it("window keeps natural order", () => {
		expect(orderedDocs(docs, "window").map((d) => d.id)).toEqual([45, 12, 7]);
	});
	it("alpha sorts by name", () => {
		expect(orderedDocs(docs, "alpha").map((d) => d.name)).toEqual(["about.md", "voice.md", "zeta.md"]);
	});
	it("recent sorts most-recently-changed first", () => {
		expect(orderedDocs(docs, "recent").map((d) => d.id)).toEqual([45, 7, 12]);
	});
	it("oldest sorts least-recently-changed first", () => {
		expect(orderedDocs(docs, "oldest").map((d) => d.id)).toEqual([12, 7, 45]);
	});
	it("does not mutate the input", () => {
		const copy = [...docs];
		orderedDocs(docs, "alpha");
		expect(docs).toEqual(copy);
	});
	it("breaks ties deterministically by id (equal mod time / equal name)", () => {
		const tied: BBEditDoc[] = [
			{ id: 30, name: "same.md", modSeconds: 100 },
			{ id: 10, name: "same.md", modSeconds: 100 },
			{ id: 20, name: "same.md", modSeconds: 100 },
		];
		expect(orderedDocs(tied, "recent").map((d) => d.id)).toEqual([10, 20, 30]);
		expect(orderedDocs(tied, "oldest").map((d) => d.id)).toEqual([10, 20, 30]);
		expect(orderedDocs(tied, "alpha").map((d) => d.id)).toEqual([10, 20, 30]);
	});
});

describe("nextDocId", () => {
	const ordered = orderedDocs(docs, "window"); // [45,12,7]
	it("next moves forward", () => {
		expect(nextDocId(ordered, 45, "next")).toBe(12);
	});
	it("prev moves backward", () => {
		expect(nextDocId(ordered, 12, "prev")).toBe(45);
	});
	it("wraps forward at the end", () => {
		expect(nextDocId(ordered, 7, "next")).toBe(45);
	});
	it("wraps backward at the start", () => {
		expect(nextDocId(ordered, 45, "prev")).toBe(7);
	});
	it("jumps to the first when the active id is unknown", () => {
		expect(nextDocId(ordered, 999, "next")).toBe(45);
	});
	it("returns null for an empty list", () => {
		expect(nextDocId([], 1, "next")).toBeNull();
	});
});

describe("ActiveDocTracker", () => {
	it("remembers the previously active id after a change", () => {
		const t = new ActiveDocTracker();
		t.note(45);
		expect(t.lastActive).toBeNull(); // nothing before the first doc
		t.note(12);
		expect(t.lastActive).toBe(45);
	});
	it("ignores repeats of the current id (a refresh is not a change)", () => {
		const t = new ActiveDocTracker();
		t.note(45);
		t.note(12);
		t.note(12);
		expect(t.lastActive).toBe(45);
	});
	it("ignores null (a failed read must not clobber history)", () => {
		const t = new ActiveDocTracker();
		t.note(45);
		t.note(12);
		t.note(null);
		expect(t.lastActive).toBe(45);
	});
	it("A -> B -> A remembers B (back-and-forth toggling works)", () => {
		const t = new ActiveDocTracker();
		t.note(45);
		t.note(12);
		t.note(45);
		expect(t.lastActive).toBe(12);
	});
});

describe("lastDocTarget", () => {
	const docs: BBEditDoc[] = [
		{ id: 45, name: "a.md", modSeconds: 1 },
		{ id: 12, name: "b.md", modSeconds: 2 },
	];
	it("returns the remembered id when it is open and not active", () => {
		expect(lastDocTarget(docs, 45, 12)).toBe(12);
	});
	it("returns null when nothing is remembered", () => {
		expect(lastDocTarget(docs, 45, null)).toBeNull();
	});
	it("returns null when the remembered doc is the active one", () => {
		expect(lastDocTarget(docs, 12, 12)).toBeNull();
	});
	it("returns null when the remembered doc was closed", () => {
		expect(lastDocTarget(docs, 45, 999)).toBeNull();
	});
});
