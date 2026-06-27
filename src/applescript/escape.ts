/** Escape a string for safe embedding inside an AppleScript double-quoted literal. */
export function escapeForAppleScript(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
