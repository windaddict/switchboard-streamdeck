/**
 * Target resolution: turn per-button settings into a concrete URL + match
 * pattern. This is the multi-account / preset logic and is intentionally pure
 * (no Stream Deck, no Safari) so it is fully unit-testable.
 */

export type Service = "gmail" | "calendar" | "custom";

/**
 * Raw settings persisted per Stream Deck key by the property inspector.
 * Declared as a `type` (not an `interface`) so it carries an implicit index
 * signature and satisfies the SDK's `JsonObject` constraint on SingletonAction.
 */
export type TargetSettings = {
	service?: Service;
	/** Google multi-account index — the N in /u/N/. May arrive as a string. */
	accountIndex?: number | string;
	/** Custom URL (used when service === "custom", or as an override). */
	url?: string;
	/** Substring used to match an open tab's URL. Optional override. */
	urlPattern?: string;
	/** Optional fallback: match against a tab's title (supports || alternates). */
	titlePattern?: string;
	/** Open in a private window instead of matching/opening a normal tab. */
	private?: boolean;
}

/** Fully resolved target ready to be turned into AppleScript. */
export interface ResolvedTarget {
	url: string;
	urlPattern: string;
	titlePattern?: string;
	private: boolean;
}

/** Coerce an account index into a non-negative integer, defaulting to 0. */
export function normalizeIndex(value: unknown): number {
	const n = typeof value === "string" ? Number.parseInt(value, 10) : (value as number);
	return Number.isFinite(n) && (n as number) >= 0 ? Math.floor(n as number) : 0;
}

/** Derive a sensible match pattern (host + path) from a full URL. */
export function derivePattern(url: string): string {
	try {
		const u = new URL(url);
		return (u.host + u.pathname).replace(/\/+$/, "");
	} catch {
		return url.trim();
	}
}

/**
 * "Teach the button": rebuild the settings around a captured live URL. The
 * button becomes a custom target for that URL (pattern derived from it); a
 * stale titlePattern is dropped so it cannot match some other tab, and the
 * private flag survives (capture changes WHERE the button goes, not HOW).
 * Returns null for a blank URL — nothing worth saving.
 */
export function captureTarget(url: string, prev: TargetSettings): TargetSettings | null {
	const trimmed = url.trim();
	if (trimmed === "") return null;
	return {
		...prev,
		service: "custom",
		url: trimmed,
		urlPattern: derivePattern(trimmed),
		titlePattern: undefined,
	};
}

export function resolveTarget(settings: TargetSettings): ResolvedTarget {
	const isPrivate = settings.private === true;
	const idx = normalizeIndex(settings.accountIndex);
	const titlePattern = settings.titlePattern?.trim() || undefined;

	// The PI's `service` dropdown only persists once actively changed, so a
	// button left on the default Gmail option saves no `service` at all. Infer
	// it: a bare URL implies a custom target, otherwise default to Gmail.
	const service: Service = settings.service ?? (settings.url?.trim() ? "custom" : "gmail");

	switch (service) {
		case "gmail":
			return {
				url: `https://mail.google.com/mail/u/${idx}/`,
				urlPattern: `mail.google.com/mail/u/${idx}`,
				titlePattern,
				private: isPrivate,
			};
		case "calendar":
			return {
				url: `https://calendar.google.com/calendar/u/${idx}/r`,
				urlPattern: `calendar.google.com/calendar/u/${idx}`,
				titlePattern,
				private: isPrivate,
			};
		case "custom":
		default: {
			const url = (settings.url ?? "").trim();
			return {
				url,
				urlPattern: settings.urlPattern?.trim() || derivePattern(url),
				titlePattern,
				private: isPrivate,
			};
		}
	}
}
