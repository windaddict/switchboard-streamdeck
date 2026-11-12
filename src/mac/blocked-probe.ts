/**
 * WHAT IT'S FOR: the one place that decides whether a key's agent is waiting
 * on you, and whether the pane must be read to find out, so "a Claude that
 * reported itself is never scraped" is a tested rule, not a comment.
 *
 * Pure: the tmux `capture-pane` call is injected as `capture`, so a test can
 * count how many times it runs. The AI Project action supplies the real
 * capture (and logs its failures); this module owns only the decision.
 *
 * Decision order, each step cheaper than the next:
 *   1. No pane for the key: {@link blockedProbeForMissingPane} (a reported
 *      Claude, Codex and a total tmux outage are `clear`; a pane-listing
 *      failure with a live tmux is `failed` for an unreported Claude/Cursor).
 *   2. {@link blockedEvidenceFor} is not `terminal` (Codex, or a Claude the
 *      CLI reported on): `clear`, and `capture` is never called. The agent's
 *      own state already says whether it is blocked.
 *   3. Otherwise capture the pane once per tick (several keys can watch the
 *      same pane; `captured` holds the in-flight PROMISE so a second key
 *      shares it) and match the agent's prompt wording.
 */

import {
	type AgentHost,
	type AgentKind,
	blockedEvidenceFor,
	blockedProbeForMissingPane,
	paneShowsAgentPrompt,
} from "./agent-project.js";
import type { AgentPane } from "./agent-scan.js";

/** One pane capture: `ok` is false when the capture itself errored. */
export type PaneShot = { ok: boolean; text: string };

export async function probeBlocked(args: {
	kind: AgentKind;
	host: AgentHost;
	pane: AgentPane | undefined;
	/** The agent itself reported its state (see `AgentInstance.reported`). */
	reported: boolean;
	panesOk: boolean;
	clientsOk: boolean;
	/** Per-tick map of in-flight captures keyed by pane id (promises, so
	 * concurrent keys on one pane share a single capture). */
	captured: Map<string, Promise<PaneShot>>;
	capture: (paneId: string) => Promise<PaneShot>;
}): Promise<"clear" | "blocked" | "failed"> {
	const { kind, host, pane, reported, panesOk, clientsOk, captured, capture } = args;
	if (pane === undefined) {
		// "No pane" is ambiguous by itself; panesOk/clientsOk tell "no session
		// here" apart from "the pane listing failed" (see the pure decision).
		return blockedProbeForMissingPane(kind, panesOk, clientsOk, reported);
	}
	if (blockedEvidenceFor(kind, host, reported) !== "terminal") return "clear";
	let shotP = captured.get(pane.paneId);
	if (shotP === undefined) {
		shotP = capture(pane.paneId);
		captured.set(pane.paneId, shotP);
	}
	const shot = await shotP;
	// A probe that errored has NOT told us the agent is unblocked.
	if (!shot.ok) return "failed";
	return paneShowsAgentPrompt(kind, shot.text) ? "blocked" : "clear";
}
