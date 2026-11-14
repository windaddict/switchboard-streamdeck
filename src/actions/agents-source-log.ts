/**
 * WHAT IT'S FOR: writes ONE log line when Switchboard loses or regains
 * `claude agents --json` (Claude Code's own state report), so a silent switch
 * to the older title/transcript signals leaves evidence. It prints only what
 * the pure `agentsSourceLogLine` returns, so the decision is tested there.
 *
 * Process-wide memory (`last`) makes this fire once per transition, never per
 * poll tick, even though AI Project and Focus tmux both report every tick. The limit: scans are logged in the order they
 * FINISH. Non-fresh callers share one in-flight scan, but a `fresh` scan (an
 * AI Project press) runs alongside a poll, so if the CLI changes availability
 * between two overlapping scans, the older one can finish last and add one
 * extra lost/regained pair of lines.
 * The reason is one of claude-scan's fixed strings and never carries CLI
 * output, so no session data reaches the log.
 */

import streamDeck from "@elgato/streamdeck";

import { type AgentsSource, agentsSourceLogLine } from "../mac/claude-agents.js";

let last: AgentsSource | undefined;

export function noteClaudeAgentsSource(
	src: { source: AgentsSource; reason: string } | undefined,
): void {
	if (src === undefined) return;
	const line = agentsSourceLogLine(last, src.source, src.reason);
	if (line !== null) streamDeck.logger[line.level](line.message);
	// `unasked` (nothing was running) neither loses nor regains the source.
	if (src.source !== "unasked") last = src.source;
}
