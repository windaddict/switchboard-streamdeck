/**
 * WHAT IT'S FOR: decides what the deck and the log say when a dial gesture
 * fails, so the six dial actions stay thin shells. Elgato's plugin guidelines
 * require `showAlert` whenever an action was unsuccessful; this module turns a
 * runner's result (native helper, osascript, tmux, front-terminal probe) into a
 * `DialReport` — the log level, one log line, and whether to flash the alert —
 * and `applyReport` applies it to injected sinks. It is the dial counterpart of
 * `focus-outcome.ts` for keys.
 *
 * Deliberate no-ops are SILENT: iTerm2 not being frontmost, or a front terminal
 * with no tmux client, is a normal state, not a failure. Repaint-only paths
 * never alert either; the shells simply do not call in here for them.
 *
 * Pure: no SDK, no I/O.
 */

import type { FrontTmuxResult } from "./front-tmux.js";

export interface DialReport {
	/** Flash the dial's alert (the SDK's `showAlert`). */
	alert: boolean;
	/** Log level for `message`; null when nothing is logged. */
	level: "warn" | "error" | null;
	/** The one log line, or null. */
	message: string | null;
}

export type Grant = "accessibility" | "automation";

/** Nothing failed (or nothing worth reporting): no alert, no log line. */
export const SILENT: DialReport = { alert: false, level: null, message: null };

const ACCESSIBILITY_PATH =
	"System Settings > Privacy & Security > Accessibility > enable Stream Deck";

/**
 * Native helpers (scroll/tile). Untrusted wins over ok:false because the
 * missing grant is the actionable cause: error + alert naming the Accessibility
 * pane. A trusted helper that still did nothing (no focused window/screen, or
 * it failed to run) is a warn + alert. A working helper is silent.
 */
export function describeHelperResult(
	label: string,
	r: { ok: boolean; trusted: boolean },
	what: string,
): DialReport {
	if (!r.trusted) {
		return {
			alert: true,
			level: "error",
			message: `${label} blocked. Grant Accessibility: ${ACCESSIBILITY_PATH} (${what} needs this).`,
		};
	}
	if (!r.ok) {
		return {
			alert: true,
			level: "warn",
			message: `${label}: ${what} did not happen — the helper reported no focused window/screen or failed to run.`,
		};
	}
	return SILENT;
}

/**
 * osascript results. A permission denial names the pane for the grant that was
 * needed (Accessibility, or Automation for `app`); any other failure carries
 * the error code and stderr. Success is silent.
 */
export function describeScriptResult(
	label: string,
	r: { ok: boolean; code: string; stderr: string },
	grant: Grant,
	app?: string,
): DialReport {
	if (r.ok) return SILENT;
	if (r.code === "permission-denied") {
		const path =
			grant === "accessibility"
				? ACCESSIBILITY_PATH
				: `System Settings > Privacy & Security > Automation > Stream Deck > enable ${app ?? "the target app"}`;
		return { alert: true, level: "error", message: `${label} blocked. Grant: ${path}.` };
	}
	return {
		alert: true,
		level: "error",
		message: `${label}: failed (${r.code}): ${r.stderr || "no stderr"}`,
	};
}

/** A failed tmux command: error + alert naming the command and its stderr. */
export function describeTmuxResult(
	label: string,
	command: string,
	r: { ok: boolean; stderr: string },
): DialReport {
	if (r.ok) return SILENT;
	return {
		alert: true,
		level: "error",
		message: `${label}: tmux ${command} failed: ${r.stderr || "no server?"}`,
	};
}

/** A gesture with nothing to act on (BBEdit with no documents): warn + alert. */
export function describeNothingToDo(label: string, reason: string): DialReport {
	return { alert: true, level: "warn", message: `${label}: ${reason}` };
}

/**
 * The front-terminal probe. `front`, `not-frontmost` and `no-client` are
 * SILENT (a background terminal or a plain shell is a normal state); only a
 * failed probe step is an error + alert.
 */
export function describeFrontTmux(label: string, r: FrontTmuxResult): DialReport {
	if (r.kind !== "probe-failed") return SILENT;
	return {
		alert: true,
		level: "error",
		message: `${label}: could not read the frontmost terminal (${r.step}): ${r.stderr || "no stderr"}`,
	};
}

/**
 * Applies a report to injected sinks: logs at `level` when `message` is set,
 * and calls `alert()` exactly once when `alert` is true. Injected so the one
 * branch the shells keep is tested without the SDK.
 */
export async function applyReport(
	report: DialReport,
	sinks: { warn(m: string): void; error(m: string): void; alert(): Promise<void> },
): Promise<void> {
	if (report.message !== null && report.level !== null) {
		sinks[report.level](report.message);
	}
	if (report.alert) {
		await sinks.alert();
	}
}
