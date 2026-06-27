import { escapeForAppleScript } from "../applescript/escape.js";

/** Raw, user-supplied settings for an "open or switch to an app" action. */
export type AppSettings = {
	/** The macOS application name, e.g. "Safari", "Google Chrome". */
	appName?: string;
	/** Optional substring to match against a window title to focus a specific window. */
	titlePattern?: string;
};

/** Normalized form of {@link AppSettings} with trimmed, validated fields. */
export interface ResolvedApp {
	appName: string;
	titlePattern?: string;
}

/**
 * Normalize raw {@link AppSettings} into a {@link ResolvedApp}.
 *
 * - `appName` is trimmed; missing → `""`.
 * - `titlePattern` is trimmed; missing or whitespace-only → `undefined`.
 */
export function resolveApp(s: AppSettings): ResolvedApp {
	const appName = (s.appName ?? "").trim();
	const trimmedPattern = (s.titlePattern ?? "").trim();
	const titlePattern = trimmedPattern.length > 0 ? trimmedPattern : undefined;
	return { appName, titlePattern };
}

/**
 * Build the AppleScript that opens or switches to the given app, optionally
 * raising the first window whose title contains `titlePattern`.
 *
 * - Empty `appName` → returns `""` (caller treats this as "not configured").
 * - No `titlePattern` → a simple `activate` (launches or switches to the app).
 * - With `titlePattern` → activates the app, then uses System Events to find
 *   and raise the first matching window.
 *
 * All interpolated user values are escaped via {@link escapeForAppleScript}.
 */
export function buildAppScript(app: ResolvedApp): string {
	if (app.appName.length === 0) {
		return "";
	}

	const appName = escapeForAppleScript(app.appName);

	if (app.titlePattern === undefined) {
		return `tell application "${appName}" to activate`;
	}

	const pattern = escapeForAppleScript(app.titlePattern);

	return [
		`tell application "${appName}" to activate`,
		`delay 0.15`,
		`tell application "System Events"`,
		`  tell process "${appName}"`,
		`    set matched to false`,
		`    repeat with w in windows`,
		`      if name of w contains "${pattern}" then`,
		`        perform action "AXRaise" of w`,
		`        set frontmost to true`,
		`        set matched to true`,
		`        exit repeat`,
		`      end if`,
		`    end repeat`,
		`  end tell`,
		`end tell`,
		`return "ok"`,
	].join("\n");
}
