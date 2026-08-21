/**
 * WHAT IT'S FOR: one question, asked once — "which coding-agent sessions are
 * running right now, and what is each one doing?" — answered in a single
 * vocabulary regardless of whether the agent is Claude Code, Codex, or Cursor.
 * The AI Project key talks to this and never to the three per-agent scanners
 * underneath it.
 *
 * This module is deliberately an ADAPTER, not a fourth scanner. The three
 * existing scanners (`claude-scan`, `codex-scan`, `cursor-scan`) keep all the
 * hard-won detection logic and are reused untouched, so there is no second
 * implementation to drift out of step and their existing tests keep guarding
 * it. What lives here is only the translation into {@link AgentInstance} and
 * the honest reconciliation of three different notions of "state".
 *
 * Two asymmetries are real and are handled explicitly rather than papered over:
 *
 *   - **Claude's state is not derivable from process facts alone.** Codex and
 *     Cursor each write a log their scanner reads, so their scanner returns a
 *     finished verdict. Claude's depends on its terminal title, its transcript,
 *     and whether a shell tool is still running — so this module needs the
 *     caller to hand it the tmux pane titles it cannot see for itself.
 *   - **Only Codex reports being blocked.** Claude and Cursor reveal an
 *     approval prompt on screen and nowhere else, so a "blocked" verdict for
 *     those two is added by the caller from a terminal scrape, and is
 *     unavailable outside tmux. See `blockedEvidenceFor` in `agent-project`.
 *
 * Scanning is per-kind on purpose: a key that has already captured its agent
 * asks for exactly one kind, so the steady-state cost is identical to the old
 * dedicated keys. Only the capture gesture pays for all three.
 *
 * The three per-kind branches run CONCURRENTLY (`Promise.all`), each kind's
 * `failedKinds` contribution computed entirely inside its own branch and only
 * merged afterward — so a Codex probe failing can never contaminate Claude's
 * or Cursor's own trustworthiness, whether the branches finish in order or not.
 *
 * FRESH-SCAN CONTRACT: `{ fresh: true }` (see {@link ScanAgentsOptions}) is
 * for a caller on the press path that needs the machine's state right now,
 * not whatever the shared 2s cache happens to hold. It is threaded straight
 * into each underlying scanner's own `fresh` option — this module adds no
 * caching of its own to bypass. The EXACT guarantee inherited from every
 * scanner beneath it: a scan that STARTED earlier can never overwrite the
 * result of one that started later (ordered by an internal start-sequence
 * counter, not a timestamp — see claude-scan.ts). It does NOT guarantee the
 * published snapshot is the single latest possible observation of the world.
 *
 * CLAUDE-STATE SELECTOR: resolving Claude's state costs a transcript read per
 * instance, which nothing else needs — Codex and Cursor's state comes free
 * from their own scanners. `claudeState` (default `"all"`) lets a caller that
 * only watches SOME Claude projects (the AI Project key, once its taught
 * targets are known) skip that read for every unwatched instance, which is
 * returned with state `"unknown"` instead. A caller that has no such
 * distinction to make (Focus tmux Window, which needs every instance's state
 * to compute a window's spark) passes nothing and gets `"all"`.
 */

import { execFile as nodeExecFile } from "node:child_process";
import { realpath } from "node:fs/promises";

import {
	type AgentInstance,
	type AgentKind,
	type AgentState,
} from "./agent-project.js";
// Shared plumbing that outlives the superseded Codex action: the scanner
// itself depends on it, so it is not going away with the key face.
import { normalizeProjectPath } from "./codex-project.js";
import { scanClaudeSnapshot } from "./claude-scan.js";
import { projectClaudeState } from "./claude-project.js";
import { titleWorking } from "./claude-state.js";
import { newestTranscriptState } from "./claude-transcript.js";
import { scanCodexSnapshot } from "./codex-scan.js";
import { scanCursorSnapshot } from "./cursor-scan.js";

/** The shared execFile shape the three scanners already accept. */
export type AgentExecFileLike = (
	file: string,
	args: readonly string[],
	options: { timeout?: number; env?: NodeJS.ProcessEnv },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => unknown;

export interface AgentSnapshot {
	/** `unknown` when ANY requested kind's probe failed. A key must not look
	 * confident about "no session here" when the question was never answered. */
	status: "ok" | "unknown";
	/**
	 * WHICH kinds failed, not merely that something did. Several keys share one
	 * snapshot, so a global flag would either let a Cursor key ignore a Cursor
	 * failure or make it gray out because an unrelated Claude probe broke.
	 * Callers should consult {@link kindTrusted} for their own kind.
	 */
	failedKinds: AgentKind[];
	instances: AgentInstance[];
}

/** Did the probe for THIS key's agent actually answer? Takes anything carrying
 * `failedKinds` so the action's own richer snapshot can be passed straight in. */
export function kindTrusted(snapshot: { failedKinds: readonly AgentKind[] }, kind: AgentKind): boolean {
	return !snapshot.failedKinds.includes(kind);
}

/** tty -> tmux pane title. Claude's working/idle marker lives in its terminal
 * title, which only the caller (which lists panes anyway) can see. */
export type PaneTitles = ReadonlyMap<string, string>;

/** Which Claude projects are worth the cost of resolving a real state for.
 * `"all"` is the default — every instance gets a state. A `Set` names
 * canonical project paths (the same normalised form {@link agentInstancesFor}
 * compares); any Claude instance NOT in it is returned with state `"unknown"`
 * and no transcript read at all. */
export type ClaudeStateSelector = "all" | ReadonlySet<string>;

export interface ScanAgentsOptions {
	/** Forwarded verbatim to every underlying scanner's own `fresh` option —
	 * see the FRESH-SCAN CONTRACT in the module header. */
	fresh?: boolean;
	/** Default `"all"` — see the module header's CLAUDE-STATE SELECTOR note. */
	claudeState?: ClaudeStateSelector;
	/** Where Claude Code's per-project transcripts live. Threaded into
	 * {@link newestTranscriptState}; omit to use its own default
	 * (`~/.claude/projects`) — tests pass a fixture path instead. */
	claudeProjectsBase?: string;
}

function normalizeTty(tty: string): string {
	if (tty === "" || tty === "??" || tty === "?") return "";
	return tty.startsWith("/dev/") ? tty : `/dev/${tty}`;
}

/**
 * Claude's verdict, assembled from the three signals its own action uses.
 * `titleWorking` is null when no pane title was available (a non-tmux host),
 * which `projectClaudeState` already treats as "fall back to transcript
 * freshness" rather than as evidence of idleness.
 *
 * Note what this deliberately CANNOT return: `blocked`. Claude keeps its idle
 * title while an approval prompt is on screen (measured), so nothing here can
 * see that — the caller supplies it from the terminal.
 */
async function computeClaudeState(
	cwd: string,
	paneTitle: string | undefined,
	shellBusy: boolean,
	projectsBase: string | undefined,
): Promise<Exclude<AgentState, "none">> {
	const transcript = projectsBase === undefined
		? await newestTranscriptState(cwd)
		: await newestTranscriptState(cwd, Date.now(), projectsBase);
	const state = projectClaudeState({
		present: true,
		titleWorking: paneTitle === undefined ? null : titleWorking(paneTitle),
		transcriptAgeMs: transcript.ageMs,
		transcriptWorking: transcript.working,
		shellBusy,
	});
	// `present: true` above forecloses "none"; the narrowing is for the compiler.
	return state === "none" ? "unknown" : state;
}

/** One kind's contribution: whether ITS OWN probe failed, and the instances it
 * found. Kept separate per kind and merged only after every branch has
 * finished (see {@link scanAgents}), so a kind that fails cannot contaminate
 * another's `failedKinds` verdict just because they ran concurrently. */
interface KindResult {
	failed: boolean;
	instances: AgentInstance[];
}

async function scanCodexBranch(exec: AgentExecFileLike, fresh: boolean): Promise<KindResult> {
	const snap = await scanCodexSnapshot(exec as never, fresh ? { fresh: true } : undefined);
	return {
		failed: snap.status !== "ok",
		instances: snap.instances.map((i) => ({
			kind: "codex" as const,
			pid: i.pid,
			tty: normalizeTty(i.tty),
			cwd: i.cwd,
			sessionId: i.sessionId,
			state: i.state,
		})),
	};
}

async function scanCursorBranch(exec: AgentExecFileLike, fresh: boolean): Promise<KindResult> {
	const snap = await scanCursorSnapshot(exec as never, undefined, fresh ? { fresh: true } : undefined);
	return {
		failed: snap.status !== "ok",
		instances: snap.instances.map((i) => ({
			kind: "cursor" as const,
			pid: i.pid,
			tty: normalizeTty(i.tty),
			cwd: i.cwd,
			sessionId: i.sessionId,
			state: i.state,
		})),
	};
}

async function scanClaudeBranch(
	exec: AgentExecFileLike,
	fresh: boolean,
	paneTitles: PaneTitles | Promise<PaneTitles>,
	claudeState: ClaudeStateSelector,
	claudeProjectsBase: string | undefined,
): Promise<KindResult> {
	const snap = await scanClaudeSnapshot(exec as never, fresh ? { fresh: true } : undefined);
	// Identity (kind/pid/tty/cwd) depends only on the scan, not on the pane
	// titles, so it is kicked off immediately and resolved ALONGSIDE the
	// titles promise below rather than waiting on it serially.
	const identityP = Promise.all(
		snap.instances.map(async (i) => {
			const tty = normalizeTty(i.tty);
			// The Codex and Cursor scanners realpath their cwd; claude-scan
			// reports lsof's raw path. Left alone, the same project reached
			// through a symlink would compare unequal across kinds and a
			// captured binding would stop matching its own session.
			let cwd = i.cwd;
			try { cwd = await realpath(i.cwd); } catch { /* may exit mid-scan */ }
			return { pid: i.pid, tty, cwd, rawCwd: i.cwd, shellBusy: i.shellBusy };
		}),
	);
	// CONTRACT (A6): this must never reject. A caller's titles promise can
	// fail (a tmux probe errored) — that degrades Claude's title signal to
	// the transcript-freshness fallback, exactly today's degraded path. It
	// must never fail the whole scan just because one caller's title probe did.
	let titles: PaneTitles;
	try {
		titles = await paneTitles;
	} catch {
		titles = new Map();
	}
	const identities = await identityP;
	const instances = await Promise.all(
		identities.map(async (id) => {
			const watched = claudeState === "all" || claudeState.has(normalizeProjectPath(id.cwd));
			const state = watched
				? await computeClaudeState(id.rawCwd, titles.get(id.tty), id.shellBusy, claudeProjectsBase)
				: ("unknown" as const);
			return {
				kind: "claude" as const,
				pid: id.pid,
				tty: id.tty,
				cwd: id.cwd,
				// Claude binds by project path — it has no captured session id.
				sessionId: "",
				state,
			};
		}),
	);
	return { failed: snap.status !== "ok", instances };
}

/**
 * Every running session of the requested kinds, in one vocabulary.
 *
 * Pass `paneTitles` whenever Claude is among the kinds: without it Claude's
 * title signal is simply absent and its state falls back to transcript
 * freshness, which is coarser. Codex and Cursor ignore it entirely. May be a
 * PROMISE — the caller's own pane listing and this scan then run in the same
 * burst instead of one blocking the other (see A6 for the non-rejecting
 * contract that makes this safe).
 */
export async function scanAgents(
	kinds: readonly AgentKind[],
	paneTitles: PaneTitles | Promise<PaneTitles> = new Map(),
	exec: AgentExecFileLike = nodeExecFile as unknown as AgentExecFileLike,
	options: ScanAgentsOptions = {},
): Promise<AgentSnapshot> {
	const wanted = new Set(kinds);
	const fresh = options.fresh === true;
	const claudeState = options.claudeState ?? "all";

	// The three per-kind branches run CONCURRENTLY — a key that has already
	// captured its agent still only pays for one, but the capture gesture
	// (which asks for all three) no longer pays for them serially.
	const [codexResult, cursorResult, claudeResult] = await Promise.all([
		wanted.has("codex") ? scanCodexBranch(exec, fresh) : null,
		wanted.has("cursor") ? scanCursorBranch(exec, fresh) : null,
		wanted.has("claude")
			? scanClaudeBranch(exec, fresh, paneTitles, claudeState, options.claudeProjectsBase)
			: null,
	]);

	const failedKinds: AgentKind[] = [];
	const instances: AgentInstance[] = [];
	// Fixed concatenation order (codex, cursor, claude) regardless of which
	// branch actually finished first.
	for (const [kind, result] of [
		["codex", codexResult],
		["cursor", cursorResult],
		["claude", claudeResult],
	] as const) {
		if (result === null) continue;
		if (result.failed) failedKinds.push(kind);
		instances.push(...result.instances);
	}

	return { status: failedKinds.length > 0 ? "unknown" : "ok", failedKinds, instances };
}

/** The kinds a key must scan: just its captured one, or all three while it is
 * still untaught and any of them could be the answer to a capture. */
export function kindsToScan(captured: AgentKind | undefined): AgentKind[] {
	return captured === undefined ? ["claude", "codex", "cursor"] : [captured];
}

/**
 * One tmux listing carrying everything the unified key needs, because the two
 * formats already in the codebase each hold only half of it: the Codex/Cursor
 * one has the window and pane IDs required to focus a pane but no title, and
 * the Claude one has the title but identifies windows by index rather than by
 * the `@id` that `select-window` wants. Asking twice would mean two probes that
 * can disagree with each other between calls.
 */
/** ASCII unit separator. Both the session name and the pane title are
 * user-controlled and may contain `|`, which the older per-agent formats had to
 * disambiguate by hunting for an `@window`/`%pane` landmark — a session named
 * `…@x|%y…` could defeat that. tmux passes this control character through `-F`
 * untouched (verified), and neither a session name nor a title contains it in
 * practice, so the split is unambiguous rather than cleverly guessed.
 *
 * The exact guarantee, not a rounded-up one: this is framing by convention, not
 * escaping. A title containing a literal unit separator would yield too many
 * fields, and one containing a newline would split into two records; either way
 * the affected pane fails the shape check and is DROPPED. A dropped pane makes
 * its session look non-tmux — the key still works, but shows amber as
 * unavailable rather than reporting something false. */
const FS = "\u001f";

export const LIST_AGENT_PANES_ARGS = [
	"list-panes",
	"-a",
	"-F",
	`#{pane_tty}${FS}#{session_name}${FS}#{window_id}${FS}#{pane_id}${FS}#{pane_active}${FS}#{window_active}${FS}#{pane_title}`,
];

export interface AgentPane {
	tty: string;
	session: string;
	windowId: string;
	paneId: string;
	/** The active pane of the session's current window — where an attached,
	 * focused client's keystrokes would actually land. */
	receivesKeys: boolean;
	title: string;
}

/** Parse {@link LIST_AGENT_PANES_ARGS}. Positional and exact: the separator
 * cannot appear inside any field, so a line either has its seven parts or is
 * malformed. The id shapes are still checked so a garbled line is dropped
 * rather than turned into a plausible-looking pane target. */
export function parseAgentPanes(output: string): AgentPane[] {
	const panes: AgentPane[] = [];
	for (const raw of output.split("\n")) {
		const line = raw.trim();
		if (line === "") continue;
		const f = line.split(FS);
		if (f.length !== 7) continue; // malformed — skipped, never guessed at
		if (!f[2].startsWith("@") || !f[3].startsWith("%")) continue;
		panes.push({
			tty: f[0],
			session: f[1],
			windowId: f[2],
			paneId: f[3],
			receivesKeys: f[4] === "1" && f[5] === "1",
			title: f[6],
		});
	}
	return panes;
}

/** tty -> title, for feeding Claude's title signal into {@link scanAgents}. */
export function paneTitlesByTty(panes: readonly AgentPane[]): Map<string, string> {
	return new Map(panes.map((p) => [p.tty, p.title]));
}

/** The pane hosting a session, matched by tty. */
export function agentPaneForTty(panes: readonly AgentPane[], tty: string): AgentPane | undefined {
	return panes.find((p) => p.tty === tty);
}

/** Raise one pane to the front of its session. Deliberately defined here rather
 * than borrowed from the per-agent modules: those carry the superseded actions
 * and are slated for deletion, and the unified key must not depend on them. */
export function agentTmuxFocusArgs(pane: AgentPane, clientTty: string): string[][] {
	const commands: string[][] = [];
	if (clientTty !== "") commands.push(["switch-client", "-c", clientTty, "-t", pane.session]);
	commands.push(["select-window", "-t", pane.windowId]);
	commands.push(["select-pane", "-t", pane.paneId]);
	return commands;
}

/** Capture one pane's VISIBLE screen — no scrollback. An approval prompt is on
 * screen for exactly as long as it is waiting, so history adds nothing but the
 * risk of matching a prompt that was already answered. */
export function captureAgentPaneArgs(paneId: string): string[] {
	return ["capture-pane", "-p", "-t", paneId];
}

/**
 * Does any coding agent in this tmux WINDOW have work in flight?
 *
 * The Focus tmux Window key answers "take me to that window", so it wants one
 * bit about the whole window rather than per-session detail: is something in
 * there still going, or is it all sitting idle? Panes are matched to sessions
 * by tty — never by `pane_current_command`, which is how the older Claude-only
 * check worked and why it could not see Cursor at all (cursor-agent presents as
 * `node`, not `cursor`).
 *
 * The exact guarantee: `working` means at least one agent in the window is
 * mid-turn. `waiting` means agents are present and none is KNOWN to be
 * computing — which includes a session whose state could not be read at all, so
 * `waiting` here is "present, not known to be busy" rather than a positive
 * claim of idleness. Callers must not pass instances from a failed probe. Note what
 * that folds together — an agent BLOCKED on your approval reports `waiting`
 * here, because it is indeed not computing, and this key has no amber to spend:
 * amber belongs to the AI Project key, which is bound to one exact session and
 * can say whose approval is wanted. Less information, not wrong information.
 *
 * Structurally typed over panes so it works with either tmux listing format.
 */
export function agentSparkForWindow(
	instances: readonly AgentInstance[],
	panes: ReadonlyArray<{ tty: string; session: string; windowName: string }>,
	session: string,
	windowName: string,
): "working" | "waiting" | "none" {
	const ttys = new Set(
		panes.filter((p) => p.session === session && p.windowName === windowName).map((p) => p.tty),
	);
	if (ttys.size === 0) return "none";
	let present = false;
	for (const i of instances) {
		if (!ttys.has(i.tty)) continue;
		present = true;
		if (i.state === "working") return "working";
	}
	return present ? "waiting" : "none";
}

/** Every running session of one kind sitting in one project folder. */
export function agentInstancesFor(
	instances: readonly AgentInstance[],
	kind: AgentKind,
	project: string,
): AgentInstance[] {
	const target = normalizeProjectPath(project);
	return instances.filter((i) => i.kind === kind && normalizeProjectPath(i.cwd) === target);
}

/**
 * Resolve the key's target session.
 *
 * A captured session id is BINDING: if that exact session is gone the answer is
 * "no target", never a neighbour that happens to share the folder — sending the
 * operator's window focus to a conversation they never captured is worse than
 * showing nothing. Claude has no session id (it binds by folder), so for Claude
 * a lone session is unambiguous and two or more are not.
 */
export function selectAgentInstance(
	instances: readonly AgentInstance[],
	kind: AgentKind,
	project: string,
	sessionId: string,
): AgentInstance | null {
	// An empty sessionId means two different things, and conflating them is a
	// hole: on the KEY it means "nothing captured", but on an INSTANCE it means
	// "we can see this session but cannot name its conversation". For a kind
	// that has conversation ids, an unnameable session must never be selectable
	// at all — otherwise capturing one would store an empty binding that
	// afterwards adopts whichever sole session happens to sit in that folder,
	// which is exactly the neighbour-adoption this function exists to prevent.
	const mine = agentInstancesFor(instances, kind, project)
		.filter((i) => !bindsBySession(kind) || i.sessionId !== "");
	if (sessionId !== "") {
		const matches = mine.filter((i) => i.sessionId === sessionId);
		return matches.length === 1 ? matches[0] : null;
	}
	return mine.length === 1 ? mine[0] : null;
}

/** Does this agent give its conversations a stable id? Codex and Cursor do, so
 * a key binds to one exact session. Claude Code does not, so its keys bind by
 * project folder and a folder with two Claude sessions is simply ambiguous. */
export function bindsBySession(kind: AgentKind): boolean {
	return kind !== "claude";
}
