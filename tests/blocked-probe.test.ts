import { beforeAll, expect, it, vi } from "vitest";

import {
	type AgentHost,
	type AgentKind,
	blockedProbeForMissingPane,
	decideAgentFace,
} from "../src/mac/agent-project.js";
import type { AgentPane } from "../src/mac/agent-scan.js";
import { reportedState } from "../src/mac/claude-agents.js";
import { claudeVerdict } from "../src/mac/claude-project.js";

/**
 * `src/mac/blocked-probe.ts` does not exist yet. It is loaded dynamically and
 * every call is guarded, so each test fails on its own assertion marker and
 * not on a missing import.
 */
type Shot = { ok: boolean; text: string };
type ProbeArgs = {
	kind: AgentKind;
	host: AgentHost;
	pane: AgentPane | undefined;
	reported: boolean;
	panesOk: boolean;
	clientsOk: boolean;
	captured: Map<string, Promise<Shot>>;
	capture: (paneId: string) => Promise<Shot>;
};
type Probe = "clear" | "blocked" | "failed";

let mod: Record<string, unknown> = {};
beforeAll(async () => {
	mod = (await import("../src/mac/blocked-probe.js").catch(() => ({}))) as Record<string, unknown>;
});
const probe = (args: ProbeArgs): Promise<Probe | undefined> | undefined =>
	typeof mod.probeBlocked === "function" ? (mod.probeBlocked as (a: ProbeArgs) => Promise<Probe>)(args) : undefined;

const PANE: AgentPane = { tty: "/dev/ttys001", session: "dev", windowId: "@1", paneId: "%1", receivesKeys: true, title: "t" };
/** A Claude bash-approval block, as `capture-pane -p` shows it. */
const APPROVAL = "Bash command\n  ls\nDo you want to proceed?\n❯ 1. Yes\n  2. No\n";

/** A capture that WOULD report a prompt, so a probe that scrapes anyway is caught. */
const promptingCapture = () => vi.fn(async (_paneId: string): Promise<Shot> => ({ ok: true, text: APPROVAL }));
const base = (over: Partial<ProbeArgs>): ProbeArgs => ({
	kind: "claude", host: "tmux", pane: PANE, reported: false, panesOk: true, clientsOk: true,
	captured: new Map(), capture: promptingCapture(), ...over,
});

it("a reported Claude in a tmux pane is never captured", async () => {
	const capture = promptingCapture();
	const result = await probe(base({ reported: true, capture }));
	expect(result, "probe: reported Claude is clear without a capture").toBe("clear");
	expect(capture, "probe: reported Claude never calls capture-pane").toHaveBeenCalledTimes(0);
});

it("an unreported Claude in tmux IS captured, and a prompt reads blocked", async () => {
	const capture = promptingCapture();
	const result = await probe(base({ reported: false, capture }));
	expect(result, "probe: unreported Claude is scraped").toBe("blocked");
	expect(capture).toHaveBeenCalledTimes(1);
	expect(capture).toHaveBeenCalledWith("%1");
});

it("a reported Claude with no pane is clear, an unreported one keeps the old answer", async () => {
	// Listing failed but tmux is alive: the old answer for an unreported Claude is "failed".
	const missing = { host: "iterm" as const, pane: undefined, panesOk: false, clientsOk: true };
	expect(await probe(base({ ...missing, reported: true })), "probe: reported Claude with no pane is clear").toBe("clear");
	const oldAnswer = (blockedProbeForMissingPane as unknown as (
		k: AgentKind, p: boolean, c: boolean, r: boolean,
	) => string)("claude", false, true, false);
	expect(oldAnswer).toBe("failed");
	expect(await probe(base({ ...missing, reported: false }))).toBe(oldAnswer);
});

it("two keys on one pane share one capture", async () => {
	const capture = promptingCapture();
	const captured = new Map<string, Promise<Shot>>();
	const [a, b] = await Promise.all([
		probe(base({ reported: false, capture, captured })),
		probe(base({ reported: false, capture, captured })),
	]);
	expect([a, b], "probe: one capture per pane per tick").toEqual(["blocked", "blocked"]);
	expect(capture.mock.calls.length).toBe(1);
});

it("a reported waiting Claude paints blocked with zero captures", async () => {
	const capture = promptingCapture();
	const blockedProbe = await probe(base({ reported: true, capture }));
	expect(blockedProbe, "probe: reported blocked paints blocked with no capture").toBe("clear");
	// The state the scan would give this instance: the CLI said "waiting".
	const instanceState = claudeVerdict({ reported: reportedState("waiting"), titleWorking: null, transcriptAgeMs: null });
	expect(instanceState, "probe: CLI waiting becomes the blocked instance state").toBe("blocked");
	const face = decideAgentFace({
		kind: "claude",
		hasTarget: true,
		matchCount: 1,
		instanceState,
		scanStatus: "ok",
		hasCapturedId: false,
		blockedProbe: blockedProbe as Probe,
	});
	expect(face).toBe("blocked");
	expect(capture).toHaveBeenCalledTimes(0);
});
