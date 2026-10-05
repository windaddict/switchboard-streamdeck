/**
 * Unit tests for `src/mac/dial-outcome.ts`: the pure decision of what the deck
 * flashes and what the log says when a dial gesture fails (the dial counterpart
 * of `focus-outcome.ts` for keys). Elgato requires `showAlert` whenever an
 * action was unsuccessful; deliberate no-ops (iTerm2 not frontmost, no tmux
 * client) must stay silent.
 *
 * The module is loaded through a try/catch dynamic import so that, while it is
 * absent, each test fails on its OWN assertion (a missing module would
 * otherwise fail the whole file at import). Every test's first assertion
 * carries the marker in its message.
 */

import { describe, expect, it, vi } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: the module may not exist yet.
type Mod = Record<string, any>;

async function load(): Promise<Mod> {
	try {
		return (await import("../src/mac/dial-outcome.js")) as Mod;
	} catch {
		return {};
	}
}

const SILENT = { alert: false, level: null, message: null };

describe("describeHelperResult", () => {
	it("an untrusted helper alerts and names the Accessibility pane", async () => {
		const m = await load();
		// ok:true + trusted:false is what the scroll helper returns when events were dropped.
		const r = m.describeHelperResult?.("Scroll Window", { ok: true, trusted: false }, "scrolling");
		expect(r?.alert, "untrusted helper must alert").toBe(true);
		expect(r?.level, "untrusted helper must log an error").toBe("error");
		expect(r?.message, "untrusted helper message must name the pane").toContain("Accessibility");
		expect(r?.message, "untrusted helper message must carry the label").toContain("Scroll Window");
		// Untrusted wins over ok:false: the grant is the actionable cause.
		const both = m.describeHelperResult?.("Scroll Window", { ok: false, trusted: false }, "scrolling");
		expect(both?.message, "untrusted helper beats ok:false").toContain("Accessibility");
	});

	it("a trusted helper that did nothing alerts as a warning", async () => {
		const m = await load();
		const r = m.describeHelperResult?.("Arrange Window", { ok: false, trusted: true }, "moving the window");
		expect(r?.alert, "helper no-window must alert").toBe(true);
		expect(r?.level, "helper no-window must log a warning").toBe("warn");
		expect(r?.message, "helper no-window message must say what did not happen").toContain("moving the window");
		expect(r?.message, "helper no-window message must carry the label").toContain("Arrange Window");
		expect(r?.message, "helper no-window message must not blame Accessibility").not.toContain("Accessibility");
	});

	it("a working helper is silent", async () => {
		const m = await load();
		const r = m.describeHelperResult?.("Scroll Window", { ok: true, trusted: true }, "scrolling");
		expect(r, "ok helper must be silent").toEqual(SILENT);
	});
});

describe("describeScriptResult", () => {
	it("a denied Accessibility script alerts and names the Accessibility pane", async () => {
		const m = await load();
		const r = m.describeScriptResult?.(
			"Scroll Window",
			{ ok: false, code: "permission-denied", stderr: "not allowed assistive access" },
			"accessibility",
		);
		expect(r?.alert, "denied script must alert").toBe(true);
		expect(r?.level, "denied script must log an error").toBe("error");
		expect(r?.message, "denied script message must name the pane").toContain(
			"Accessibility > enable Stream Deck",
		);
		expect(r?.message, "denied script message must carry the label").toContain("Scroll Window");
	});

	it("a denied Automation script names the app to enable", async () => {
		const m = await load();
		const r = m.describeScriptResult?.(
			"BBEdit Documents",
			{ ok: false, code: "permission-denied", stderr: "" },
			"automation",
			"BBEdit",
		);
		expect(r?.message, "denied automation must name the app").toContain("enable BBEdit");
		expect(r?.message, "denied automation must name the Automation pane").toContain("Automation");
		expect(r?.message, "denied automation must not send the user to Accessibility").not.toContain(
			"Accessibility",
		);
		expect(r?.alert, "denied automation must alert").toBe(true);
	});

	it("a generic script error alerts and carries the code and stderr", async () => {
		const m = await load();
		const r = m.describeScriptResult?.(
			"Cycle App Windows",
			{ ok: false, code: "error", stderr: "boom" },
			"accessibility",
		);
		expect(r?.message, "script error must carry stderr").toContain("boom");
		expect(r?.message, "script error must carry the code").toContain("(error)");
		expect(r?.message, "script error must carry the label").toContain("Cycle App Windows");
		expect(r?.alert, "script error must alert").toBe(true);
		expect(r?.level, "script error must log an error").toBe("error");
		// A generic failure is not a permission problem: no pane advice.
		expect(r?.message, "script error must not blame a permission").not.toContain("enable Stream Deck");
	});

	it("a generic script error with empty stderr says so", async () => {
		const m = await load();
		const r = m.describeScriptResult?.(
			"Cycle App Windows",
			{ ok: false, code: "error", stderr: "" },
			"accessibility",
		);
		expect(r?.message, "script error without stderr must say no stderr").toContain("no stderr");
	});

	it("a working script does not alert", async () => {
		const m = await load();
		const r = m.describeScriptResult?.("Scroll Window", { ok: true, code: "success", stderr: "" }, "accessibility");
		expect(r?.alert, "ok script must not alert").toBe(false);
		expect(r, "ok script must be silent").toEqual(SILENT);
	});
});

describe("describeTmuxResult", () => {
	it("a failed tmux command alerts and names the command and stderr", async () => {
		const m = await load();
		const r = m.describeTmuxResult?.("Switch tmux Pane", "select-pane", { ok: false, stderr: "no current client" });
		expect(r?.message, "tmux failure must name the command").toContain("tmux select-pane failed");
		expect(r?.message, "tmux failure must carry stderr").toContain("no current client");
		expect(r?.message, "tmux failure must carry the label").toContain("Switch tmux Pane");
		expect(r?.alert, "tmux failure must alert").toBe(true);
		expect(r?.level, "tmux failure must log an error").toBe("error");
	});

	it("a failed tmux command with empty stderr says no server", async () => {
		const m = await load();
		const r = m.describeTmuxResult?.("Cycle tmux Window", "list-windows", { ok: false, stderr: "" });
		expect(r?.message, "tmux failure without stderr must say no server?").toContain("no server?");
	});

	it("a working tmux command is silent", async () => {
		const m = await load();
		const r = m.describeTmuxResult?.("Cycle tmux Window", "list-windows", { ok: true, stderr: "" });
		expect(r, "ok tmux command must be silent").toEqual(SILENT);
	});
});

describe("describeNothingToDo", () => {
	it("warns and alerts with the reason", async () => {
		const m = await load();
		const r = m.describeNothingToDo?.("BBEdit Documents", "no documents open in the front window");
		expect(r?.level, "nothing-to-do must warn").toBe("warn");
		expect(r?.alert, "nothing-to-do must alert").toBe(true);
		expect(r?.message, "nothing-to-do must carry the label").toContain("BBEdit Documents");
		expect(r?.message, "nothing-to-do must carry the reason").toContain("no documents open in the front window");
	});
});

describe("describeFrontTmux", () => {
	it("a failed probe alerts and names the step and stderr", async () => {
		const m = await load();
		const r = m.describeFrontTmux?.("Switch tmux Pane", {
			kind: "probe-failed",
			step: "list-clients",
			stderr: "tmux: no server",
		});
		expect(r?.alert, "front probe failure must alert").toBe(true);
		expect(r?.message, "front probe failure must name the step").toContain("list-clients");
		expect(r?.message, "front probe failure must carry stderr").toContain("tmux: no server");
		expect(r?.message, "front probe failure must carry the label").toContain("Switch tmux Pane");
		expect(r?.level, "front probe failure must log an error").toBe("error");
	});

	it("a failed probe with empty stderr says no stderr", async () => {
		const m = await load();
		const r = m.describeFrontTmux?.("Switch tmux Pane", { kind: "probe-failed", step: "front-app", stderr: "" });
		expect(r?.message, "front probe failure without stderr must say no stderr").toContain("no stderr");
	});

	it("iTerm2 not being frontmost is silent", async () => {
		const m = await load();
		const r = m.describeFrontTmux?.("Switch tmux Pane", { kind: "not-frontmost" });
		expect(r, "not-frontmost must be silent").toEqual(SILENT);
	});

	it("a front terminal with no tmux client is silent", async () => {
		const m = await load();
		const r = m.describeFrontTmux?.("Switch tmux Pane", { kind: "no-client" });
		expect(r, "no-client must be silent").toEqual(SILENT);
	});

	it("a resolved front terminal is silent", async () => {
		const m = await load();
		const r = m.describeFrontTmux?.("Switch tmux Pane", { kind: "front", front: { session: "dev", tty: "/dev/ttys001" } });
		expect(r, "resolved front terminal must be silent").toEqual(SILENT);
	});
});

describe("applyReport", () => {
	function sinks() {
		return { warn: vi.fn(), error: vi.fn(), alert: vi.fn(async () => {}) };
	}

	it("calls alert once and logs once at the report's level", async () => {
		const m = await load();
		const s = sinks();
		await m.applyReport?.({ alert: true, level: "error", message: "Scroll Window: boom" }, s);
		expect(s.alert, "applyReport must call alert for an alerting report").toHaveBeenCalledTimes(1);
		expect(s.error, "applyReport must log the message at error").toHaveBeenCalledTimes(1);
		expect(s.error).toHaveBeenCalledWith("Scroll Window: boom");
		expect(s.warn, "applyReport must not also log at warn").not.toHaveBeenCalled();
	});

	it("logs a warning at warn, not error", async () => {
		const m = await load();
		const s = sinks();
		await m.applyReport?.({ alert: true, level: "warn", message: "Arrange Window: nothing moved" }, s);
		expect(s.warn, "applyReport must log a warn report at warn").toHaveBeenCalledWith("Arrange Window: nothing moved");
		expect(s.error, "applyReport must not log a warn report at error").not.toHaveBeenCalled();
		expect(s.alert, "applyReport must alert a warn report").toHaveBeenCalledTimes(1);
	});

	it("does nothing for a silent report", async () => {
		const m = await load();
		const s = sinks();
		await m.applyReport?.(SILENT, s);
		// A silent report must produce no alert AND no log. A missing function would also produce nothing, so the existence guard comes first and is this test's red state while the module is absent.
		expect(typeof m.applyReport, "applyReport must exist (a silent no-op cannot otherwise be told from a missing function)").toBe(
			"function",
		);
		expect(s.alert, "applyReport must not alert for a silent report").not.toHaveBeenCalled();
		expect(s.warn, "applyReport must not log a silent report at warn").not.toHaveBeenCalled();
		expect(s.error, "applyReport must not log a silent report at error").not.toHaveBeenCalled();
	});

	it("does not alert for a log-only report", async () => {
		const m = await load();
		const s = sinks();
		await m.applyReport?.({ alert: false, level: "warn", message: "noted" }, s);
		expect(s.warn, "applyReport must still log a non-alerting report").toHaveBeenCalledWith("noted");
		expect(s.alert, "applyReport must not alert a non-alerting report").not.toHaveBeenCalled();
	});
});
