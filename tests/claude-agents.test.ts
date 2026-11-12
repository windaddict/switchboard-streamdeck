import { beforeAll, expect, it } from "vitest";

/**
 * `src/mac/claude-agents.ts` does not exist yet. The module is loaded
 * dynamically and every call is guarded, so each test fails on its own
 * assertion marker rather than on a missing import or a TypeError.
 */
let mod: Record<string, unknown> = {};
beforeAll(async () => {
	mod = (await import("../src/mac/claude-agents.js").catch(() => ({}))) as Record<string, unknown>;
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (name: string, ...args: unknown[]): any =>
	typeof mod[name] === "function" ? (mod[name] as (...a: unknown[]) => unknown)(...args) : undefined;

const BACKGROUND = { id: "bg1", cwd: "/Users/j/code/x", kind: "background", startedAt: 1, sessionId: "s0", name: "bg", state: "blocked" };
const inter = (pid: number, status: string, extra: Record<string, unknown> = {}) => ({
	pid, cwd: `/Users/j/code/p${pid}`, kind: "interactive", startedAt: 1, sessionId: `sid-${pid}`, name: "n", status, ...extra,
});

it("parses interactive sessions by pid and drops background entries", () => {
	const json = JSON.stringify([
		BACKGROUND,
		inter(3292, "idle"),
		inter(51352, "busy"),
		inter(54515, "waiting", { waitingFor: "permission prompt" }),
	]);
	expect(call("parseClaudeAgents", json), "claude-agents: interactive sessions keyed by pid").toEqual({
		ok: true,
		sessions: [
			{ pid: 3292, cwd: "/Users/j/code/p3292", sessionId: "sid-3292", status: "idle", waitingFor: "" },
			{ pid: 51352, cwd: "/Users/j/code/p51352", sessionId: "sid-51352", status: "busy", waitingFor: "" },
			{ pid: 54515, cwd: "/Users/j/code/p54515", sessionId: "sid-54515", status: "waiting", waitingFor: "permission prompt" },
		],
	});
});

it("invalid JSON, a non-array and empty stdout are unavailable, never an empty list", () => {
	for (const bad of ["", "{}", "not json"]) {
		expect(call("parseClaudeAgents", bad)?.ok, "claude-agents: garbage must be unavailable, not empty").toBe(false);
	}
});

it("an entry without an integer pid or with another kind is dropped, the rest kept", () => {
	const json = JSON.stringify([
		{ kind: "interactive" },
		{ kind: "interactive", pid: "12" },
		{ kind: "future", pid: 7 },
		inter(9, "idle"),
	]);
	const parsed = call("parseClaudeAgents", json);
	expect(parsed?.ok, "claude-agents: pidless entries dropped").toBe(true);
	expect(parsed.sessions.map((s: { pid: number }) => s.pid)).toEqual([9]);
});

it("a listing that keeps no session but dropped a non-background entry is unavailable", () => {
	// A renamed `kind` or `pid` field drops every entry; reading that as an
	// empty report would silently lose every Claude key's state with no log.
	for (const entries of [
		[{ type: "interactive", pid: 9, status: "idle" }],
		[{ kind: "interactive", processId: 9, status: "idle" }],
		[{ kind: "background", state: "working" }, { type: "interactive", pid: 9, status: "busy" }],
		// Two renamed entries: the guard is "any dropped", not "exactly one".
		[{ type: "interactive", pid: 9, status: "idle" }, { type: "interactive", pid: 10, status: "busy" }],
		// A non-positive pid names no process pgrep can find, so it keeps nothing.
		[{ kind: "interactive", pid: 0, status: "idle" }],
		[{ kind: "interactive", pid: -4, status: "busy" }],
	]) {
		expect(call("parseClaudeAgents", JSON.stringify(entries)), "claude-agents: all-dropped listing is unavailable").toEqual({
			ok: false,
			reason: "no usable interactive entry",
		});
	}
	// Background-only and empty listings are normal, not a format change.
	expect(call("parseClaudeAgents", JSON.stringify([{ kind: "background", state: "working" }]))).toEqual({ ok: true, sessions: [] });
	expect(call("parseClaudeAgents", "[]")).toEqual({ ok: true, sessions: [] });
});

it("an interactive entry with a pid but a missing, renamed or non-string status is unavailable", () => {
	const noStatus = { pid: 9, cwd: "/x", kind: "interactive", sessionId: "s" };
	const renamed = { pid: 9, cwd: "/x", kind: "interactive", sessionId: "s", state: "busy" };
	const numeric = { pid: 9, cwd: "/x", kind: "interactive", sessionId: "s", status: 5 };
	const empty = { pid: 9, cwd: "/x", kind: "interactive", sessionId: "s", status: "" };
	for (const entry of [noStatus, renamed, numeric, empty]) {
		expect(
			call("parseClaudeAgents", JSON.stringify([entry])),
			"claude-agents: statusless interactive entry is unavailable",
		).toEqual({ ok: false, reason: "interactive entry without status" });
	}
});

it("the log decision fires once on loss and once on recovery and never otherwise", () => {
	const line = (p: unknown, n: unknown, r: string) => call("agentsSourceLogLine", p, n, r);
	expect(line("ok", "unavailable", "exit 1"), "claude-agents: loss logs one warn line").toEqual({
		level: "warn",
		message: "Claude state: claude agents --json unavailable (exit 1); falling back to title/transcript signals",
	});
	expect(line(undefined, "unavailable", "no claude binary")?.level).toBe("warn");
	expect(line("unavailable", "ok", "")).toEqual({
		level: "info",
		message: "Claude state: claude agents --json available again",
	});
	expect(line("ok", "ok", "")).toBeNull();
	expect(line("unavailable", "unavailable", "exit 1")).toBeNull();
	expect(line("ok", "unasked", "")).toBeNull();
});

it("busy reads working, waiting reads blocked, idle reads waiting", () => {
	expect(call("reportedState", "busy"), "claude-agents: busy reads working").toBe("working");
	expect(call("reportedState", "waiting")).toBe("blocked");
	expect(call("reportedState", "idle")).toBe("waiting");
});

it("an unrecognised status reads unknown, never blocked (fail-safe)", () => {
	for (const s of ["parked", "", "BUSY", "blocked"]) {
		expect(call("reportedState", s), "claude-agents: unrecognised status must be unknown").toBe("unknown");
	}
});

it("findClaudePath probes absolute candidates in order and is null when none exists", () => {
	const seen: string[] = [];
	const only = (p: string) => (path: string) => { seen.push(path); return path === p; };
	expect(
		call("findClaudePath", only("/usr/local/bin/claude"), "/Users/j"),
		"claude-agents: first existing candidate",
	).toBe("/usr/local/bin/claude");
	expect(seen).toEqual(["/opt/homebrew/bin/claude", "/usr/local/bin/claude"]);
	expect(call("findClaudePath", () => false, "/Users/j")).toBeNull();
});

it("waitingFor is carried verbatim and reads empty when absent", () => {
	const json = JSON.stringify([
		inter(1, "waiting", { waitingFor: "sandbox request" }),
		inter(2, "waiting"),
	]);
	const parsed = call("parseClaudeAgents", json);
	expect(
		parsed?.sessions?.map((s: { waitingFor: string }) => s.waitingFor),
		"claude-agents: waitingFor carried",
	).toEqual(["sandbox request", ""]);
});

it("agentsSourceTransition reports lost once and regained once, and unasked is transparent", () => {
	const t = (p: unknown, n: unknown) => call("agentsSourceTransition", p, n);
	expect(t("ok", "unavailable"), "claude-agents: ok→unavailable is lost").toBe("lost");
	expect(t(undefined, "unavailable")).toBe("lost");
	expect(t("unavailable", "ok")).toBe("regained");
	expect(t("ok", "ok")).toBeNull();
	expect(t("unavailable", "unavailable")).toBeNull();
	expect(t("ok", "unasked")).toBeNull();
	expect(t("unavailable", "unasked")).toBeNull();
});

it("isRecognisedReport is true only for a state the CLI decided", () => {
	expect(call("isRecognisedReport", "working"), "claude-agents: working is a recognised report").toBe(true);
	expect(call("isRecognisedReport", "blocked")).toBe(true);
	expect(call("isRecognisedReport", "waiting")).toBe(true);
	expect(call("isRecognisedReport", "unknown")).toBe(false);
	expect(call("isRecognisedReport", null)).toBe(false);
	expect(call("isRecognisedReport", undefined)).toBe(false);
});
