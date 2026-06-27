import { describe, it, expect } from "vitest";
import {
	globToRegExp,
	matchesGlob,
	selectFile,
	buildOpenArgs,
	expandHome,
	type FileEntry,
} from "../src/mac/files.js";

describe("expandHome", () => {
	it("expands a bare ~", () => {
		expect(expandHome("~", "/Users/x")).toBe("/Users/x");
	});
	it("expands a leading ~/", () => {
		expect(expandHome("~/ea-system/state", "/Users/x")).toBe("/Users/x/ea-system/state");
	});
	it("leaves absolute and non-tilde paths unchanged", () => {
		expect(expandHome("/abs/path", "/Users/x")).toBe("/abs/path");
		expect(expandHome("", "/Users/x")).toBe("");
		expect(expandHome("relative/dir", "/Users/x")).toBe("relative/dir");
	});
});

describe("globToRegExp / matchesGlob", () => {
	it("* is anchored (suffix match)", () => {
		expect(matchesGlob("notes.md", "*.md")).toBe(true);
		expect(matchesGlob("notes.md.bak", "*.md")).toBe(false);
	});
	it("? matches exactly one character", () => {
		expect(matchesGlob("a1.txt", "a?.txt")).toBe(true);
		expect(matchesGlob("a12.txt", "a?.txt")).toBe(false);
	});
	it("is case-insensitive", () => {
		expect(matchesGlob("README.MD", "readme.md")).toBe(true);
	});
	it("treats other regex metacharacters literally", () => {
		expect(matchesGlob("a.b", "a.b")).toBe(true);
		expect(matchesGlob("axb", "a.b")).toBe(false);
	});
	it("empty pattern matches anything", () => {
		expect(matchesGlob("whatever", "")).toBe(true);
	});
	it("globToRegExp returns an anchored RegExp", () => {
		expect(globToRegExp("*.ts").source).toBe("^.*\\.ts$");
	});
});

const entries: FileEntry[] = [
	{ name: "2026-06-01.md", mtimeMs: 100, birthtimeMs: 10 },
	{ name: "2026-06-27.md", mtimeMs: 50, birthtimeMs: 90 },
	{ name: "image.png", mtimeMs: 999, birthtimeMs: 5 },
];

describe("selectFile", () => {
	it("'modified' picks the highest mtime (respecting the pattern)", () => {
		expect(selectFile(entries, "*.md", "modified")?.name).toBe("2026-06-01.md");
	});
	it("'created' picks the highest birthtime", () => {
		expect(selectFile(entries, "*.md", "created")?.name).toBe("2026-06-27.md");
	});
	it("'name' picks the last in descending name order", () => {
		expect(selectFile(entries, "*.md", "name")?.name).toBe("2026-06-27.md");
	});
	it("pattern filters the candidate set", () => {
		expect(selectFile(entries, "*.png", "modified")?.name).toBe("image.png");
	});
	it("returns null when nothing matches", () => {
		expect(selectFile(entries, "*.zip", "modified")).toBeNull();
	});
	it("empty pattern considers all files", () => {
		expect(selectFile(entries, "", "modified")?.name).toBe("image.png");
	});
});

describe("buildOpenArgs", () => {
	it("default app => just the file", () => {
		expect(buildOpenArgs("/d/f.md", "default")).toEqual(["/d/f.md"]);
	});
	it("bbedit => open -a BBEdit", () => {
		expect(buildOpenArgs("/d/f.md", "bbedit")).toEqual(["-a", "BBEdit", "/d/f.md"]);
	});
	it("named app => open -a <app>", () => {
		expect(buildOpenArgs("/d/f.md", "app", "/Applications/VS Code.app")).toEqual([
			"-a",
			"/Applications/VS Code.app",
			"/d/f.md",
		]);
	});
	it("app selected but blank => falls back to default", () => {
		expect(buildOpenArgs("/d/f.md", "app", "   ")).toEqual(["/d/f.md"]);
	});
});
