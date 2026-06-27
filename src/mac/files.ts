/**
 * Pure logic for the "Open File" action: glob matching, picking a file from a
 * directory listing by a strategy, and building `open` arguments. The actual
 * filesystem read and process launch live in the action; everything here is
 * pure and unit-testable.
 */

export interface FileEntry {
	name: string;
	mtimeMs: number;
	birthtimeMs: number;
}

/** How to choose among the files matching the pattern. */
export type PickMode = "modified" | "created" | "name";

/** Which application opens the chosen file. */
export type Opener = "default" | "bbedit" | "app";

/**
 * Convert a filename glob (`*` = any run, `?` = one char) into an anchored,
 * case-insensitive RegExp. All other regex metacharacters are matched literally.
 */
export function globToRegExp(glob: string): RegExp {
	const specials = /[.+^${}()|[\]\\]/;
	let body = "";
	for (const ch of glob) {
		if (ch === "*") body += ".*";
		else if (ch === "?") body += ".";
		else body += specials.test(ch) ? `\\${ch}` : ch;
	}
	return new RegExp(`^${body}$`, "i");
}

/** Whether a filename matches the glob (empty/`*` matches everything). */
export function matchesGlob(name: string, glob: string): boolean {
	const g = glob.trim() || "*";
	return globToRegExp(g).test(name);
}

/**
 * Pick one file from `entries` matching `pattern`, by `mode`:
 *   - "modified": most recently modified (mtime)
 *   - "created":  most recently created (birthtime)
 *   - "name":     last in descending name order (handy for date-named files)
 * Returns null when nothing matches.
 */
export function selectFile(
	entries: FileEntry[],
	pattern: string,
	mode: PickMode,
): FileEntry | null {
	const re = globToRegExp(pattern.trim() || "*");
	const matches = entries.filter((e) => re.test(e.name));
	if (matches.length === 0) return null;

	const compare =
		mode === "created"
			? (a: FileEntry, b: FileEntry) => b.birthtimeMs - a.birthtimeMs
			: mode === "name"
				? (a: FileEntry, b: FileEntry) => b.name.localeCompare(a.name)
				: (a: FileEntry, b: FileEntry) => b.mtimeMs - a.mtimeMs;

	return [...matches].sort(compare)[0] ?? null;
}

/**
 * Build `open` CLI args for the chosen file. Default app: `open <file>`;
 * BBEdit: `open -a BBEdit <file>`; a named/path app: `open -a <app> <file>`.
 * Falls back to the default app when "app" is selected but none is provided.
 */
export function buildOpenArgs(filePath: string, opener: Opener, app?: string): string[] {
	if (opener === "bbedit") return ["-a", "BBEdit", filePath];
	if (opener === "app" && app && app.trim() !== "") return ["-a", app.trim(), filePath];
	return [filePath];
}
