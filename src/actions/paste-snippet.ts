import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type JsonValue,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	type SendToPluginEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { runAppleScript, runAppleScriptWithArgs, runJxa, runJxaWithArgs, runJxaWithStdin } from "../applescript/runner.js";
import { captureViaAx, decideCaptureRoute, type AxDeps } from "../mac/ax-text.js";
import { captureSnippet, insertSnippet, READ_FRONTMOST_BUNDLE_SCRIPT, SECURE_INPUT_PROBE_SCRIPT, parseSecureInputProbe, safeLogToken, type ClipboardDeps } from "../mac/clipboard-snippet.js";
import { buildSnippetKeyImage, MAX_SNIPPET_BYTES, resolveSnippetFace, withinSizeCap } from "../mac/snippet.js";
import { svgToDataUri } from "../mac/svg.js";
import { PressGate } from "../mac/press-gate.js";
import { respondToAccessibilityCheck } from "./pi-permissions.js";

const KNOWN_ERROR_NAMES: ReadonlySet<string> = new Set([
	"Error",
	"TypeError",
	"RangeError",
	"SyntaxError",
	"ReferenceError",
	"EvalError",
	"URIError",
	"AggregateError",
	"DOMException",
]);

export /**
 * The constructor name, and NOTHING else. Not `error.name`: that property is
 * writable, and `e.name = "leaked:" + e.message` demonstrably round-trips the
 * message through it — which is exactly the leak this exists to prevent. Not
 * the message, not the stack. A throw from anywhere that touched the
 * selection/snippet text can carry that text, and this action's contract is
 * that such text never reaches a log line at any level.
 */
function errorClass(error: unknown): string {
	if (error === null || error === undefined) return typeof error;
	// An EXACT allowlist of the built-in error types, not a shape check: a
	// class name is normally a safe identifier, but a dynamically named
	// constructor can be built from arbitrary text — and a name-shaped secret
	// would pass any pattern. Anything else logs as the useless-but-safe
	// "Error", which is the whole point of this function.
	const ctor = (error as { constructor?: { name?: unknown } }).constructor;
	const name = typeof ctor?.name === "string" ? ctor.name : "";
	return KNOWN_ERROR_NAMES.has(name) ? name : error instanceof Error ? "Error" : typeof error;
}

type PasteSnippetSettings = {
	content?: string;
	/** Show dots + a character count on the key instead of the text. Opt-in:
	 * the face previews the text unless this is explicitly true. */
	mask?: boolean;
	/** Provenance, recorded for diagnostics: "captured" is set by the
	 * long-press gesture, "typed" by the PI's text field. It does NOT affect
	 * the key face — captured content used to
	 * default to masked, and no longer does (masking is opt-in per key). */
	source?: "captured" | "typed";
};

/**
 * One key, two gestures: press inserts the stored text at the cursor; a
 * long-press (the shared PressGate gesture, 500ms) captures whatever's
 * currently selected into the key instead. The BUTTON is the storage.
 *
 * THE TWO GESTURES ROUTE DIFFERENTLY, and the asymmetry is deliberate.
 * CAPTURE tries ACCESSIBILITY FIRST — reading `AXSelectedText` on the
 * frontmost app's focused element via `mac/ax-text.ts` — because that route
 * never touches the system clipboard; it falls back to ⌘C on anything but a
 * successful read, which in practice is most places (measured: iTerm2 reports
 * "nothing selected" even when text IS selected, and Safari and ChatGPT's web
 * content don't expose the attribute at all). INSERT always uses ⌘V: the
 * accessibility WRITE was measured reporting success in iTerm2 while
 * inserting nothing, and a confident false success is worse than touching the
 * clipboard. So in practice both gestures usually do go through
 * `mac/clipboard-snippet.ts`, which deliberately does not save or restore
 * whatever was on the clipboard before (see that module's header for why).
 * The routing rules themselves — `decideCaptureRoute`/`decideInsertRoute` in
 * `ax-text.ts` — are pure and unit-tested; this shell just calls them and
 * dispatches. One route is logged per gesture (`accessibility` or
 * `clipboard`) as a plain outcome code, never with any selection/snippet
 * content.
 *
 * The face previews what's stored, however the text arrived; ticking "show
 * dots" per key replaces the preview with a character count. It also has
 * faces for the two states that would otherwise look like a broken key: text
 * with nothing printable in it, and text over the size cap (see
 * `resolveSnippetFace` in mac/snippet.ts).
 *
 * All the AppleScript/JXA plumbing — Accessibility probing, the Secure Input
 * and concealed-copy refusals, framing pasteboard/AX reads so selection text
 * can never be confused with the framing itself, and delivering text ONLY
 * via STDIN/argv so it can never become script source — lives in
 * `mac/ax-text.ts` and `mac/clipboard-snippet.ts`, tested against injected
 * dependencies. This shell is just SDK wiring: build the real dependencies,
 * call the pure orchestration, map the outcome to showOk/showAlert/log,
 * repaint.
 */
@action({ UUID: "com.movingavg.switchboard.snippet" })
export class PasteSnippet extends SingletonAction<PasteSnippetSettings> {
	private readonly gate = new PressGate();
	private readonly visible = new Map<string, KeyAction<PasteSnippetSettings>>();

	override async onWillAppear(ev: WillAppearEvent<PasteSnippetSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		// Persisted settings are INPUT, not truth: a value written by an older
		// build, restored from a profile backup, or hand-edited in the profile
		// JSON can exceed the cap.
		const settings = ev.payload.settings;
		if (!withinSizeCap(settings.content ?? "")) {
			streamDeck.logger.warn(
				`Paste Snippet: stored content is over the ${MAX_SNIPPET_BYTES}-byte cap; ` +
					"this key will not paste until it is shortened in its settings.",
			);
		}
		// The operator's data is left EXACTLY as it is in every case. Refusing
		// to use an over-cap snippet is honest; rewriting, truncating or
		// reverting their content to make the key work would destroy something
		// they may want and cannot get back. The key face says why it is inert.
		await this.repaint(ev.action, settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<PasteSnippetSettings>): void {
		this.gate.cancel(ev.action.id);
		this.visible.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PasteSnippetSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		const settings = ev.payload.settings;
		const content = settings.content ?? "";
		if (!withinSizeCap(content)) {
			// Refuse to USE it, never truncate it, and never revert it: this is
			// text the operator just typed or pasted into their own settings
			// field, and silently replacing it loses work. Alert + an explicit
			// key face, then leave it to them to shorten.
			streamDeck.logger.warn(
				`Paste Snippet: stored content is ${Buffer.byteLength(content, "utf8")} bytes, ` +
					`over the ${MAX_SNIPPET_BYTES}-byte cap — this key will not paste until it is shortened.`,
			);
			await ev.action.showAlert();
		}
		await this.repaint(ev.action, settings);
	}

	override onKeyDown(ev: KeyDownEvent<PasteSnippetSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((error) =>
				streamDeck.logger.error(
					`Paste Snippet: capture threw (${errorClass(error)}) — details omitted, they can carry selection text.`,
				),
			);
		});
	}

	override async onKeyUp(ev: KeyUpEvent<PasteSnippetSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return; // long-press already fired capture()
		await this.paste(ev.action);
	}

	/** Answer the property inspector's live Accessibility-permission check. */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, PasteSnippetSettings>): Promise<void> {
		await respondToAccessibilityCheck(ev.payload, import.meta.url);
	}

	private deps(): ClipboardDeps {
		return {
			runAppleScript: (script) => runAppleScript(script),
			runJxa: (script) => runJxa(script),
			runJxaWithArgs: (script, args) => runJxaWithArgs(script, args),
			runJxaWithStdin: (script, input) => runJxaWithStdin(script, input),
			// Content-free, structural logging only — byte counts and outcome
			// codes, never clipboard/snippet text.
			log: (message) => streamDeck.logger.warn(`Paste Snippet: ${message}`),
		};
	}

	private axDeps(): AxDeps {
		return {
			runAppleScript: (script) => runAppleScript(script),
			runAppleScriptWithArgs: (script, args) => runAppleScriptWithArgs(script, args),
			// Content-free, structural logging only — outcome codes and OS-level
			// error NUMBERS, never selection/snippet text or an error MESSAGE.
			log: (message) => streamDeck.logger.warn(`Paste Snippet: ${message}`),
		};
	}

	/** Save a confirmed-good captured value (from either route) onto the key. */
	private async saveCaptured(action: KeyAction<PasteSnippetSettings>, content: string): Promise<void> {
		const settings = await action.getSettings();
		const next: PasteSnippetSettings = { ...settings, content, source: "captured" };
		await action.setSettings(next);
		await action.showOk();
		await this.repaint(action, next);
	}

	/**
	 * Which app will actually receive this gesture. Logged as a bundle id —
	 * an identifier, never content — because "it reported success but nothing
	 * happened" is almost always this: the frontmost app at key-time is not the
	 * one the operator is looking at. Clicking the key in the Stream Deck WINDOW
	 * makes Stream Deck frontmost; pressing the physical deck does not.
	 */
	/** The frontmost bundle id, shape-checked before it can reach a log line
	 * (see safeLogToken) — it is raw child stdout like every other value here. */
	private async frontmostApp(): Promise<string> {
		const res = await runJxa(READ_FRONTMOST_BUNDLE_SCRIPT);
		if (!res.ok) return "";
		const trimmed = res.stdout.trim();
		return trimmed === "" ? "" : safeLogToken(trimmed);
	}

	private async capture(action: KeyAction<PasteSnippetSettings>): Promise<void> {
		streamDeck.logger.info(`Paste Snippet: capture targeting frontmost=${(await this.frontmostApp()) || "unknown"}`);
		// SECURE INPUT IS CHECKED HERE, BEFORE EITHER ROUTE — not inside the
		// clipboard path. The accessibility route reads the selection directly
		// and never goes near the pasteboard, so a guard living only in the
		// clipboard code left the operator's own rule ("refuse when we KNOW the
		// field is marked secure") unenforced on exactly the path that skips it.
		// A failed probe proceeds and logs: we refuse only when we KNOW.
		const secure = await runJxa(SECURE_INPUT_PROBE_SCRIPT);
		const secureState = secure.ok ? parseSecureInputProbe(secure.stdout) : "unknown";
		if (secureState === "secure") {
			streamDeck.logger.warn("Paste Snippet: capture refused — secure input is active (a password field has focus).");
			await action.showAlert();
			return;
		}
		if (secureState === "unknown") {
			streamDeck.logger.warn("Paste Snippet: secure-input probe unavailable; proceeding (we refuse only when we KNOW).");
		}
		const axResult = await captureViaAx(this.axDeps());
		const route = decideCaptureRoute(axResult);

		if (route === "use-ax") {
			// decideCaptureRoute only returns "use-ax" for an "ok" AxReadResult.
			const text = (axResult as { status: "ok"; text: string }).text;
			if (!withinSizeCap(text)) {
				streamDeck.logger.warn(`Paste Snippet: capture refused — selection exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`);
				await action.showAlert();
				return;
			}
			streamDeck.logger.info("Paste Snippet: capture route=accessibility");
			await this.saveCaptured(action, text);
			return;
		}

		// fall-back: accessibility couldn't help here (unsupported, or we
		// couldn't tell) — go through the clipboard instead.
		const outcome = await captureSnippet(this.deps());
		switch (outcome.status) {
			case "ok":
				streamDeck.logger.info("Paste Snippet: capture route=clipboard");
				await this.saveCaptured(action, outcome.content);
				return;
			case "secure-input":
				streamDeck.logger.warn("Paste Snippet: capture refused — Secure Input is on (a password field is likely focused).");
				await action.showAlert();
				return;
			case "no-selection":
				streamDeck.logger.warn("Paste Snippet: capture found nothing selected.");
				await action.showAlert();
				return;
			case "concealed":
				streamDeck.logger.warn(
					"Paste Snippet: capture refused — the copied item is marked concealed (likely a password manager copy).",
				);
				await action.showAlert();
				return;
			case "not-text":
				streamDeck.logger.warn("Paste Snippet: capture refused — no plain text was on the clipboard after the copy.");
				await action.showAlert();
				return;
			case "churn":
				streamDeck.logger.warn("Paste Snippet: capture refused — the clipboard changed again while reading it.");
				await action.showAlert();
				return;
			case "read-fail":
				streamDeck.logger.warn("Paste Snippet: capture refused — could not read the clipboard after the copy.");
				await action.showAlert();
				return;
			case "too-big":
				streamDeck.logger.warn(`Paste Snippet: capture refused — selection exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`);
				await action.showAlert();
				return;
			case "permission-denied":
				streamDeck.logger.error("Paste Snippet: capture needs Accessibility access for Stream Deck.");
				await action.showAlert();
				return;
			case "error":
			default:
				streamDeck.logger.error(`Paste Snippet: capture failed (${safeLogToken(outcome.detail ?? "unknown")}).`);
				await action.showAlert();
				return;
		}
	}

	/** Stored content is INPUT on every path, not just when it arrives. */
	private async paste(action: KeyAction<PasteSnippetSettings>): Promise<void> {
		streamDeck.logger.info(`Paste Snippet: insert targeting frontmost=${(await this.frontmostApp()) || "unknown"}`);
		const settings = await action.getSettings();
		const content = settings.content ?? "";
		if (content === "") {
			await action.showAlert();
			return;
		}
		// The cap is checked here too, not only where content ARRIVES. A value
		// restored from a profile backup, written by an older build, or edited
		// into the profile JSON reaches this path without ever passing through
		// the load or settings-change checks.
		if (!withinSizeCap(content)) {
			streamDeck.logger.warn(
				`Paste Snippet: refusing to paste — stored content exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`,
			);
			await action.showAlert();
			return;
		}
		// Insert ALWAYS goes through the clipboard — see decideInsertRoute. The
		// accessibility write cannot be verified and was measured lying: iTerm2
		// accepted it, reported ok, and inserted nothing. A confident false
		// success is worse than touching the clipboard.
		const outcome = await insertSnippet(content, this.deps());
		switch (outcome.status) {
			case "ok":
				streamDeck.logger.info("Paste Snippet: insert route=clipboard");
				await action.showOk();
				return;
			case "too-big":
				streamDeck.logger.warn(`Paste Snippet: refusing to paste — stored content exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`);
				await action.showAlert();
				return;
			case "write-failed":
				streamDeck.logger.warn(`Paste Snippet: paste refused — writing the clipboard failed (${safeLogToken(outcome.detail)}).`);
				await action.showAlert();
				return;
			case "not-confirmed":
				streamDeck.logger.warn("Paste Snippet: paste refused — could not confirm the clipboard write landed.");
				await action.showAlert();
				return;
			case "frontmost-changed":
				streamDeck.logger.warn("Paste Snippet: paste refused — the frontmost app changed before the paste keystroke.");
				await action.showAlert();
				return;
			case "clobbered":
				streamDeck.logger.warn("Paste Snippet: paste refused — something else wrote to the clipboard after us; ⌘V would have pasted that instead.");
				await action.showAlert();
				return;
			case "permission-denied":
				streamDeck.logger.error("Paste Snippet: paste needs Accessibility access for Stream Deck.");
				await action.showAlert();
				return;
			case "error":
			default:
				streamDeck.logger.warn(`Paste Snippet: paste failed (${safeLogToken(outcome.detail ?? "unknown")}).`);
				await action.showAlert();
				return;
		}
	}

	private async repaint(action: KeyAction<PasteSnippetSettings>, settings: PasteSnippetSettings): Promise<void> {
		try {
			const face = resolveSnippetFace(settings);
			await action.setImage(svgToDataUri(buildSnippetKeyImage(face)));
		} catch (err) {
			streamDeck.logger.debug(`Paste Snippet: key image update skipped (${errorClass(err)}).`);
		}
	}
}
