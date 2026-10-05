/**
 * Shell-harness tests for the six dial actions (Scroll Window, Arrange Window,
 * Switch tmux Pane, Cycle tmux Window, Cycle App Windows, BBEdit Documents).
 * Elgato requires `showAlert` whenever an action was unsuccessful, so a failed
 * gesture must flash the dial AND log exactly once; a deliberate no-op (iTerm2
 * not frontmost, no tmux client) and every repaint-only path must stay silent.
 *
 * These tests EXECUTE the real shell classes. The SDK and every runner
 * (osascript, tmux, the native helpers, the front-terminal probe) are replaced
 * by scripted fakes, so each test drives a handler with a scripted failure and
 * observes the two sinks a user can see: the dial's `showAlert` and the logger.
 * A grep over the source could not tell a call from a comment; this can.
 *
 * Shape: one `it` per failure branch (the handler-by-outcome matrix). Its FIRST
 * assertions are the alert ones (alert called once, one log call); the silent
 * trailers that belong to the same handler follow in the same `it`, re-armed with
 * `rearm()`, so a silent branch cannot pass on its own before the feature exists
 * while still being pinned afterwards. Per-gesture rule (not per dial): when the
 * front terminal is not iTerm2 or has no tmux client, tmux ROTATIONS and the
 * window dial's PUSH do nothing silently, while the pane dial's push/tap and the
 * window dial's tap still toggle their own state.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { BBEDIT_LIST_SCRIPT } from "../src/mac/bbedit.js";

// ---- scripted fakes -------------------------------------------------------

type Run = { ok: boolean; code: string; stdout: string; stderr: string };
type Front =
	| { kind: "front"; front: { session: string; tty: string } }
	| { kind: "not-frontmost" }
	| { kind: "no-client" }
	| { kind: "probe-failed"; step: string; stderr: string };

const h = vi.hoisted(() => ({
	log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn() },
	runScroll: vi.fn(),
	runTile: vi.fn(),
	runAppleScript: vi.fn(),
	runJxa: vi.fn(),
	runTmux: vi.fn(),
	/** What the front-terminal probe reports. */
	front: { kind: "not-frontmost" } as unknown,
	/** Per-tmux-subcommand scripted result, keyed by args[0]. */
	tmuxPlan: {} as Record<string, unknown>,
	/** BBEdit: result of the list script, and of every select script. */
	bbList: undefined as unknown,
	bbSelect: undefined as unknown,
	/** App windows / scroll: result of the next non-BBEdit osascript calls. */
	script: undefined as unknown,
}));

vi.mock("@elgato/streamdeck", () => ({
	default: { logger: h.log, ui: { current: undefined } },
	action: () => (target: unknown) => target,
	SingletonAction: class {},
}));
vi.mock("../src/mac/scroll-runner.js", () => ({ runScroll: h.runScroll }));
vi.mock("../src/mac/tile-runner.js", () => ({ runTile: h.runTile }));
vi.mock("../src/applescript/runner.js", () => ({ runAppleScript: h.runAppleScript, runJxa: h.runJxa }));
vi.mock("../src/mac/tmux-runner.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/mac/tmux-runner.js")>()),
	findTmuxPath: () => "/opt/tmux",
	runTmux: h.runTmux,
}));
vi.mock("../src/mac/front-tmux.js", () => ({
	invalidateFrontTmux: () => {},
	resolveFrontTmuxDetailed: async () => h.front,
	resolveFrontTmux: async () => ((h.front as Front).kind === "front" ? (h.front as { front: unknown }).front : null),
}));
vi.mock("../src/actions/pi-permissions.js", () => ({ respondToAccessibilityCheck: async () => false }));

import { CycleAppWindows } from "../src/actions/app-windows-dial.js";
import { ArrangeWindow } from "../src/actions/tile-dial.js";
import { BBEditDocDial } from "../src/actions/bbedit-doc-dial.js";
import { ScrollWindow } from "../src/actions/scroll-dial.js";
import { TmuxPaneDial } from "../src/actions/tmux-pane-dial.js";
import { CycleTmuxWindow } from "../src/actions/tmux-window-dial.js";

const OK_RUN: Run = { ok: true, code: "success", stdout: "", stderr: "" };
const DENIED: Run = { ok: false, code: "permission-denied", stdout: "", stderr: "not allowed assistive access" };
const BROKEN: Run = { ok: false, code: "error", stdout: "", stderr: "boom" };
const FRONT: Front = { kind: "front", front: { session: "dev", tty: "/dev/ttys007" } };
const PROBE_FAILED: Front = { kind: "probe-failed", step: "list-clients", stderr: "no server running" };
const TMUX_OK = { ok: true, stdout: "", stderr: "" };
const TMUX_FAIL = { ok: false, stdout: "", stderr: "no current client" };
const WINDOWS = "dev|0|1|one\ndev|1|0|two\n";
const BB_LIST = (active: number) => `1\tA.txt\t10\n2\tB.txt\t20\nACTIVE\t${active}`;

// ---- a fake dial and the handlers' event shapes ---------------------------

let dialCount = 0;
function makeDial(initial: Record<string, unknown> = {}) {
	let settings = { ...initial };
	return {
		id: `dial-${++dialCount}`,
		isDial: () => true,
		showAlert: vi.fn(async () => {}),
		setFeedback: vi.fn(async () => {}),
		getSettings: vi.fn(async () => ({ ...settings })),
		setSettings: vi.fn(async (next: Record<string, unknown>) => {
			settings = { ...next };
		}),
	};
}
type Dial = ReturnType<typeof makeDial>;

const rotate = (action: Dial, ticks: number, settings: Record<string, unknown> = {}) =>
	({ action, payload: { ticks, settings, pressed: false, coordinates: { column: 0, row: 0 } } }) as never;
const press = (action: Dial, settings: Record<string, unknown> = {}) =>
	({ action, payload: { settings, controller: "Encoder", coordinates: { column: 0, row: 0 } } }) as never;
const appear = (action: Dial, settings: Record<string, unknown> = {}) =>
	({ action, payload: { settings, controller: "Encoder", isInMultiAction: false } }) as never;
const vanish = (action: Dial) => ({ action }) as never;

/** Warn and error lines written to the log (debug/info are not user-visible failures). */
const logged = () => h.log.warn.mock.calls.length + h.log.error.mock.calls.length;

function expectAlert(d: Dial, what: string): void {
	expect(d.showAlert.mock.calls.length, `${what} must alert`).toBe(1);
	expect(logged(), `${what} must log exactly once`).toBe(1);
}
function expectSilent(d: Dial, what: string): void {
	expect(d.showAlert.mock.calls.length, `${what} must stay silent`).toBe(0);
	expect(logged(), `${what} must not log`).toBe(0);
}
/** Clear the sinks between the alert case and its silent trailers. */
function rearm(d: Dial): void {
	d.showAlert.mockClear();
	h.log.warn.mockClear();
	h.log.error.mockClear();
	h.runTmux.mockClear();
}
const tmuxCalls = (sub: string) => h.runTmux.mock.calls.filter((c) => (c[0] as string[])[0] === sub);

beforeEach(() => {
	for (const f of [h.log.warn, h.log.error, h.log.info, h.log.debug, h.log.trace, h.runScroll, h.runTile, h.runAppleScript, h.runJxa, h.runTmux]) {
		f.mockReset();
	}
	h.front = { kind: "not-frontmost" };
	h.tmuxPlan = {};
	h.script = OK_RUN;
	h.bbList = { ...OK_RUN, stdout: BB_LIST(1) };
	h.bbSelect = { ...OK_RUN, stdout: "A.txt" };
	h.runScroll.mockResolvedValue({ ok: true, trusted: true });
	h.runTile.mockResolvedValue({ ok: true, trusted: true });
	h.runJxa.mockImplementation(async () => h.script);
	h.runAppleScript.mockImplementation(async (script: string) =>
		script === BBEDIT_LIST_SCRIPT ? h.bbList : script.includes("BBEdit") ? h.bbSelect : h.script,
	);
	h.runTmux.mockImplementation(async (args: string[]) => {
		const planned = h.tmuxPlan[args[0]];
		if (planned !== undefined) return planned;
		if (args[0] === "list-windows") return { ok: true, stdout: WINDOWS, stderr: "" };
		if (args[0] === "display-message") return { ok: true, stdout: "dev|0|one", stderr: "" };
		return TMUX_OK;
	});
});

// ---- Scroll Window --------------------------------------------------------

describe("Scroll Window dial", () => {
	it("scroll helper untrusted must alert (rotate); healthy and zero-tick turns stay silent", async () => {
		const a = new ScrollWindow();
		const d = makeDial();
		h.runScroll.mockResolvedValue({ ok: true, trusted: false });
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "scroll helper untrusted");

		rearm(d);
		h.runScroll.mockResolvedValue({ ok: true, trusted: true });
		await a.onDialRotate(rotate(d, 1));
		await a.onDialRotate(rotate(d, 0));
		expect(h.runScroll.mock.calls.length, "scroll rotate must reach the helper once per real turn").toBe(2);
		expectSilent(d, "scroll healthy rotate");
	});

	it("scroll helper failed to run must alert (rotate)", async () => {
		const a = new ScrollWindow();
		const d = makeDial();
		h.runScroll.mockResolvedValue({ ok: false, trusted: true });
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "scroll helper failed to run");
	});

	it("scroll press permission-denied must alert; a healthy press and a speed toggle stay silent", async () => {
		const a = new ScrollWindow();
		const d = makeDial();
		h.script = DENIED;
		await a.onDialDown(press(d));
		expectAlert(d, "scroll press permission-denied");

		rearm(d);
		h.script = OK_RUN;
		await a.onDialDown(press(d));
		await a.onDialDown(press(d, { pressAction: "toggleSpeed" }));
		await a.onTouchTap(press(d));
		expect(d.setSettings.mock.calls.length, "scroll toggles must still persist the speed").toBe(2);
		expectSilent(d, "scroll healthy press");
	});

	it("scroll press generic script failure must alert", async () => {
		const a = new ScrollWindow();
		const d = makeDial();
		h.script = BROKEN;
		await a.onDialDown(press(d));
		expectAlert(d, "scroll press script failure");
	});
});

// ---- Arrange Window -------------------------------------------------------

describe("Arrange Window dial", () => {
	it("tile helper untrusted must alert once (rotate); a healthy turn stays silent", async () => {
		const a = new ArrangeWindow();
		const d = makeDial();
		// What the real runner reports when the helper prints "untrusted": ok:false AND trusted:false.
		h.runTile.mockResolvedValue({ ok: false, trusted: false });
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tile helper untrusted");

		rearm(d);
		h.runTile.mockResolvedValue({ ok: true, trusted: true });
		await a.onDialRotate(rotate(d, 1));
		await a.onTouchTap(press(d));
		expect(d.setSettings.mock.calls.length, "tile healthy turn and tap must persist state").toBeGreaterThan(0);
		expectSilent(d, "tile healthy rotate");
	});

	it("tile helper no-window must alert (rotate) and must not persist a position", async () => {
		const a = new ArrangeWindow();
		const d = makeDial();
		h.runTile.mockResolvedValue({ ok: false, trusted: true });
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tile helper no-window");
		expect(d.setSettings.mock.calls.length, "a position the screen does not show must not be saved").toBe(0);
	});

	it("tile press no-window must alert; a healthy press stays silent", async () => {
		const a = new ArrangeWindow();
		const d = makeDial();
		h.runTile.mockResolvedValue({ ok: false, trusted: true });
		await a.onDialDown(press(d));
		expectAlert(d, "tile press no-window");

		rearm(d);
		h.runTile.mockResolvedValue({ ok: true, trusted: true });
		await a.onDialDown(press(d));
		expectSilent(d, "tile healthy press");
	});

	it("tile press untrusted must alert once", async () => {
		const a = new ArrangeWindow();
		const d = makeDial();
		h.runTile.mockResolvedValue({ ok: false, trusted: false });
		await a.onDialDown(press(d));
		expectAlert(d, "tile press untrusted");
	});
});

// ---- Switch tmux Pane -----------------------------------------------------

describe("Switch tmux Pane dial", () => {
	it("tmux pane probe-failed must alert (rotate); not-frontmost and no-client turns stay silent; push still toggles", async () => {
		const a = new TmuxPaneDial();
		const d = makeDial();
		h.front = PROBE_FAILED;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux pane probe-failed");

		for (const quiet of [{ kind: "not-frontmost" }, { kind: "no-client" }]) {
			rearm(d);
			h.front = quiet;
			await a.onDialRotate(rotate(d, 1));
			expect(h.runTmux.mock.calls.length, `tmux pane ${quiet.kind} must not run a tmux command`).toBe(0);
			expectSilent(d, `tmux pane ${quiet.kind} rotate`);
		}

		// Per-gesture rule: the push toggles the dial's own mode even with no tmux target.
		rearm(d);
		h.front = { kind: "not-frontmost" };
		await a.onDialDown(press(d));
		expect(d.setSettings.mock.calls.length, "tmux pane push must still toggle the mode when not frontmost").toBe(1);
		expect(d.setSettings.mock.calls[0][0], "tmux pane push must flip panes to windows").toMatchObject({ mode: "windows" });
		expectSilent(d, "tmux pane push toggle");
	});

	it("tmux pane select-pane failure must alert; a healthy turn stays silent", async () => {
		const a = new TmuxPaneDial();
		const d = makeDial();
		h.front = FRONT;
		h.tmuxPlan["select-pane"] = TMUX_FAIL;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux pane select-pane failure");
		expect(h.log.error.mock.calls.concat(h.log.warn.mock.calls).flat().join(" "), "the log line must name the command").toContain("select-pane");

		rearm(d);
		h.tmuxPlan["select-pane"] = TMUX_OK;
		await a.onDialRotate(rotate(d, 1));
		expect(tmuxCalls("select-pane").length, "a healthy turn must run select-pane").toBe(1);
		expectSilent(d, "tmux pane healthy rotate");
	});

	it("tmux pane windows-mode failure must alert", async () => {
		const a = new TmuxPaneDial();
		const d = makeDial({ mode: "windows" });
		h.front = FRONT;
		h.tmuxPlan["next-window"] = TMUX_FAIL;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux pane windows-mode failure");
	});
});

// ---- Cycle tmux Window ----------------------------------------------------

describe("Cycle tmux Window dial", () => {
	it("tmux window rotate probe-failed must alert; not-frontmost and no-client turns stay silent", async () => {
		const a = new CycleTmuxWindow();
		const d = makeDial();
		h.front = PROBE_FAILED;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux window rotate probe-failed");

		for (const quiet of [{ kind: "not-frontmost" }, { kind: "no-client" }]) {
			rearm(d);
			h.front = quiet;
			await a.onDialRotate(rotate(d, 1));
			expect(h.runTmux.mock.calls.length, `tmux window ${quiet.kind} must not run a tmux command`).toBe(0);
			expectSilent(d, `tmux window ${quiet.kind} rotate`);
		}
	});

	it("tmux window session-scope command failure must alert", async () => {
		const a = new CycleTmuxWindow();
		const d = makeDial();
		h.front = FRONT;
		h.tmuxPlan["next-window"] = TMUX_FAIL;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux window next-window failure");
	});

	it("tmux window list-windows failure must alert (all scope)", async () => {
		const a = new CycleTmuxWindow();
		const d = makeDial();
		h.front = FRONT;
		await a.onTouchTap(press(d)); // session -> all scope
		rearm(d);
		h.tmuxPlan["list-windows"] = TMUX_FAIL;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux window list-windows failure");
		expect(tmuxCalls("switch-client").length, "a failed list must not switch anything").toBe(0);
	});

	it("tmux window display-message failure must alert and stop before switching (all scope)", async () => {
		const a = new CycleTmuxWindow();
		const d = makeDial();
		h.front = FRONT;
		await a.onTouchTap(press(d));
		rearm(d);
		h.tmuxPlan["display-message"] = TMUX_FAIL;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux window display-message failure");
		expect(tmuxCalls("switch-client").length, "an unknown current window must not guess a target").toBe(0);

		// Nothing to cycle to is not a failure: an empty window list stays silent.
		rearm(d);
		h.tmuxPlan["display-message"] = { ok: true, stdout: "dev|0|one", stderr: "" };
		h.tmuxPlan["list-windows"] = { ok: true, stdout: "", stderr: "" };
		await a.onDialRotate(rotate(d, 1));
		expect(tmuxCalls("list-windows").length, "the silent trailer must actually query the list").toBeGreaterThan(0);
		expectSilent(d, "tmux window empty list");
	});

	it("tmux window switch-client failure must alert (all scope)", async () => {
		const a = new CycleTmuxWindow();
		const d = makeDial();
		h.front = FRONT;
		await a.onTouchTap(press(d));
		rearm(d);
		h.tmuxPlan["switch-client"] = TMUX_FAIL;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "tmux window switch-client failure");
	});

	it("tmux window push command failure must alert; a healthy push stays silent", async () => {
		const a = new CycleTmuxWindow();
		const d = makeDial();
		h.front = FRONT;
		h.tmuxPlan["last-window"] = TMUX_FAIL;
		await a.onDialDown(press(d));
		expectAlert(d, "tmux window push command failure");

		rearm(d);
		h.tmuxPlan["last-window"] = TMUX_OK;
		await a.onDialDown(press(d));
		expect(tmuxCalls("last-window").length, "a healthy push must run last-window").toBe(1);
		expectSilent(d, "tmux window healthy push");
	});

	it("tmux window push probe-failed must alert; not-frontmost and no-client pushes stay silent", async () => {
		const a = new CycleTmuxWindow();
		const d = makeDial();
		h.front = PROBE_FAILED;
		await a.onDialDown(press(d));
		expectAlert(d, "tmux window push probe-failed");

		for (const quiet of [{ kind: "not-frontmost" }, { kind: "no-client" }]) {
			rearm(d);
			h.front = quiet;
			await a.onDialDown(press(d));
			expect(h.runTmux.mock.calls.length, `tmux window push ${quiet.kind} must run no tmux command`).toBe(0);
			expectSilent(d, `tmux window push ${quiet.kind}`);
		}

		// The tap only changes the dial's own scope, so it works with no tmux target.
		rearm(d);
		await a.onTouchTap(press(d));
		expectSilent(d, "tmux window scope tap");
	});
});

// ---- Cycle App Windows ----------------------------------------------------

describe("Cycle App Windows dial", () => {
	it("app windows permission-denied must alert; appearance with a failed readback and a healthy turn stay silent", async () => {
		const a = new CycleAppWindows();
		const d = makeDial();
		h.script = DENIED;
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "app windows permission-denied");

		// Repaint-only path: the strip readback failing on appearance never alerts.
		rearm(d);
		await a.onWillAppear(appear(d));
		expectSilent(d, "app windows appearance readback");

		rearm(d);
		h.script = OK_RUN;
		await a.onDialRotate(rotate(d, 1));
		a.onWillDisappear(vanish(d)); // cancels the debounced strip refresh
		expect(h.runAppleScript.mock.calls.length, "a healthy turn must run the cycle script").toBeGreaterThan(0);
		expectSilent(d, "app windows healthy rotate");
	});

	it("app windows generic script failure must alert", async () => {
		const a = new CycleAppWindows();
		const d = makeDial();
		h.script = BROKEN;
		await a.onDialRotate(rotate(d, 1));
		a.onWillDisappear(vanish(d));
		expectAlert(d, "app windows generic script failure");
	});

	it("app windows apps-mode failure must alert", async () => {
		const a = new CycleAppWindows();
		const d = makeDial();
		await a.onTouchTap(press(d)); // windows -> apps mode
		rearm(d);
		h.script = BROKEN;
		await a.onDialRotate(rotate(d, 1));
		a.onWillDisappear(vanish(d));
		expect(h.runJxa.mock.calls.length, "apps mode must cycle through JXA").toBeGreaterThan(0);
		expectAlert(d, "app windows apps-mode failure");
	});
});

// ---- BBEdit Documents -----------------------------------------------------

const selectCalls = () => h.runAppleScript.mock.calls.filter((c) => c[0] !== BBEDIT_LIST_SCRIPT);

describe("BBEdit Documents dial", () => {
	it("bbedit rotate read failure must alert once; appearing with the same failure never alerts", async () => {
		const a = new BBEditDocDial();
		const d = makeDial();
		h.bbList = DENIED; // permission-denied used to log two lines; it must be one
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "bbedit rotate read failure");

		// F007: placing the dial must not flash an alert; the strip gets the hint instead.
		rearm(d);
		await a.onWillAppear(appear(d));
		expect(d.showAlert.mock.calls.length, "bbedit appearance must stay silent").toBe(0);
		expect(d.setFeedback.mock.calls.at(-1)?.[0], "bbedit appearance must paint the grant hint").toMatchObject({
			current: "grant access",
		});
	});

	it("bbedit push read failure must alert", async () => {
		const a = new BBEditDocDial();
		const d = makeDial();
		h.bbList = BROKEN;
		await a.onDialDown(press(d));
		expectAlert(d, "bbedit push read failure");
	});

	it("bbedit push select failure must alert", async () => {
		const a = new BBEditDocDial();
		const d = makeDial();
		await a.onWillAppear(appear(d)); // learns active document 1
		rearm(d);
		h.bbList = { ...OK_RUN, stdout: BB_LIST(2) }; // the user switched to document 2 in BBEdit
		h.bbSelect = BROKEN;
		await a.onDialDown(press(d));
		expect(selectCalls().length, "push must try to jump back to the previous document").toBe(1);
		expectAlert(d, "bbedit push select failure");
	});

	it("bbedit rotate select failure must alert once and stop", async () => {
		const a = new BBEditDocDial();
		const d = makeDial();
		h.bbSelect = BROKEN;
		await a.onDialRotate(rotate(d, 2)); // two detents scripted
		expectAlert(d, "bbedit rotate select failure");
		expect(selectCalls().length, "a failed selection must stop the remaining detents").toBe(1);

		// The same scripts succeeding is not a failure: no alert, no log.
		rearm(d);
		h.runAppleScript.mockClear();
		h.bbSelect = { ...OK_RUN, stdout: "B.txt" };
		await a.onDialRotate(rotate(d, 1));
		expect(selectCalls().length, "a healthy rotate must select a document").toBe(1);
		expectSilent(d, "bbedit healthy rotate");
	});

	it("bbedit rotate with no documents must alert", async () => {
		const a = new BBEditDocDial();
		const d = makeDial();
		h.bbList = { ...OK_RUN, stdout: "" };
		await a.onDialRotate(rotate(d, 1));
		expectAlert(d, "bbedit rotate with no documents");
	});
});
