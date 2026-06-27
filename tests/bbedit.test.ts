import { describe, it, expect } from "vitest";
import { BBEDIT_CURRENT_DOC_SCRIPT, bbeditCycleDocScript } from "../src/mac/bbedit.js";

describe("BBEDIT_CURRENT_DOC_SCRIPT", () => {
	it("returns the active document of the front text window", () => {
		expect(BBEDIT_CURRENT_DOC_SCRIPT).toContain('tell application "BBEdit"');
		expect(BBEDIT_CURRENT_DOC_SCRIPT).toContain("active document of text window 1");
	});
});

describe("bbeditCycleDocScript", () => {
	it("cycles text documents only (skips non-editor project/folder items)", () => {
		expect(bbeditCycleDocScript("next")).toContain("set docs to text documents of w");
		expect(bbeditCycleDocScript("next")).not.toContain("set docs to documents of w");
	});
	it("next steps forward (+1) and selects the new document", () => {
		const s = bbeditCycleDocScript("next");
		expect(s).toContain("set t to idx + (1)");
		expect(s).toContain("select (item t of docs)");
		expect(s).toContain("return name of active document of w");
	});
	it("prev steps backward (-1)", () => {
		expect(bbeditCycleDocScript("prev")).toContain("set t to idx + (-1)");
	});
	it("wraps around both ends", () => {
		const s = bbeditCycleDocScript("next");
		expect(s).toContain("if t < 1 then set t to n");
		expect(s).toContain("if t > n then set t to 1");
	});
});
