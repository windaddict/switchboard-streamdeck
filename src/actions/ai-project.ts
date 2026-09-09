import streamDeck, {
	action,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";
import { realpath } from "node:fs/promises";
import { homedir } from "node:os";

import { runAppleScript, runJxa } from "../applescript/runner.js";
import { FRONT_APP_BUNDLE_JXA } from "../mac/app-windows.js";
import {
	agentBindingKey,
	agentForFocusedTty,
	agentTickInteresting,
	type AgentHost,
	type AgentInstance,
	type AgentKind,
	type AgentState,
	type AgentTurnMemory,
	agentUnknownIsAmbiguity,
	commitIsStale,
	blockedEvidenceFor,
	blockedProbeForMissingPane,
	buildAgentProjectKeyImage,
	decideAgentFace,
	initialTurnMemory,
	paneShowsAgentPrompt,
	trackAgentTurn,
	unseenIsActionable,
} from "../mac/agent-project.js";
import {
	type AgentPane,
	agentInstancesFor,
	agentPaneForTty,
	agentTmuxFocusArgs,
	captureAgentPaneArgs,
	type ClaudeStateSelector,
	kindsToScan,
	kindTrusted,
	LIST_AGENT_PANES_ARGS,
	paneTitlesByTty,
	parseAgentPanes,
	scanAgents,
	selectAgentInstance,
} from "../mac/agent-scan.js";
import { normalizeProjectPath } from "../mac/codex-project.js";
import { CoalescedRunner, shouldPollThisTick } from "../mac/coalesce.js";
import { buildITermRaiseScript, ITERM_BUNDLE_ID, ITERM_FOCUSED_TTY_SCRIPT, parseITermFocusResult } from "../mac/iterm.js";
import { PressGate } from "../mac/press-gate.js";
import { svgToDataUri } from "../mac/svg.js";
import { chooseClientTty, parseClientTtys } from "../mac/tmux.js";
import { findTmuxPath, LIST_CLIENTS_ARGS, runTmux } from "../mac/tmux-runner.js";
import {
	buildTerminalRaiseScript,
	TERMINAL_BUNDLE_ID,
	TERMINAL_FOCUSED_TTY_SCRIPT,
	TERMINAL_PROCESS_NAME,
} from "../mac/terminal.js";
import { processRunning } from "../mac/claude-scan.js";
import { expandHome } from "../mac/files.js";
import { runFocusPress } from "./focus-lock.js";

type AiProjectSettings = {
	/** Which coding agent this key was taught to follow. Absent until the
	 * teaching gesture works it out from whatever was frontmost. */
	agent?: AgentKind;
	project?: string;
	/** Codex and Cursor bind to an exact session; Claude has no session id and
	 * binds by project path alone. */
	sessionId?: string;
};

interface Snapshot {
	instances: AgentInstance[];
	panes: AgentPane[];
	clientTtys: Map<string, string[]>;
	frontBundle: string;
	focusedTty: string;
	scanStatus: "ok" | "unknown";
	failedKinds: AgentKind[];
	/** Did `list-clients` answer? Indistinguishable from "no tmux server" in
	 * general — but if panes came back, tmux is plainly alive and a failure here
	 * means the client map is missing, not empty. */
	clientsOk: boolean;
	/** Did `list-panes` answer? (A4) A failure here is NOT the same as "no
	 * matching pane" — see {@link blockedProbeForMissingPane}, which is what
	 * this field exists to feed. */
	panesOk: boolean;
}

const POLL_MS = 2500;

/**
 * One live key for one coding-agent session, whichever agent that is.
 *
 * Supersedes the three per-agent keys. Hold it for half a second while Claude
 * Code, Codex, or Cursor is frontmost and it works out which of the three it is
 * looking at, then behaves exactly as the dedicated key did: blue while a turn
 * runs, amber when the agent is waiting on you, white at an idle prompt, and
 * the bar lit when your keystrokes would reach that exact session.
 */
@action({ UUID: "com.movingavg.switchboard.aiproject" })
export class AiProject extends SingletonAction<AiProjectSettings> {
	private readonly gate = new PressGate();
	private readonly visible = new Map<string, KeyAction<AiProjectSettings>>();
	private readonly lastImage = new Map<string, string>();
	/**
	 * The unread mark's memory, one entry per visible key.
	 *
	 * In memory on purpose, not in settings: it changes on most transition ticks
	 * (settings are not a 2.5s scratchpad), and persisting it would let a
	 * restarted plugin display a mark for a transition it never watched — which
	 * is the one thing the mark is not allowed to do. The cost is stated in the
	 * docs: a restart or a page switch forgets a pending mark.
	 */
	private readonly turnMemory = new Map<string, AgentTurnMemory>();
	/**
	 * Bumped whenever something OUTSIDE the poll changes what a key means or
	 * what it has acknowledged — a capture, or a successful raise.
	 *
	 * A refresh pass reads settings up front and then spends several hundred
	 * milliseconds on probes before it commits anything. Without this, a press
	 * landing inside that window would be undone: the pass would write back the
	 * memory it computed from the pre-press world, and the key would go on
	 * claiming an unread result the operator is currently looking at. The pass
	 * compares the counter it started with and drops its commit if it moved.
	 */
	private readonly pressGen = new Map<string, number>();
	private readonly refresher = new CoalescedRunner(() => this.doRefreshAll());
	private timer?: ReturnType<typeof setInterval>;
	private spin = 0;
	private tick = 0;
	private interesting = true;

	override async onWillAppear(ev: WillAppearEvent<AiProjectSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => {
				if (shouldPollThisTick(this.tick++, this.interesting)) void this.refreshAll();
			}, POLL_MS);
		}
		await this.refreshAll();
	}

	override onWillDisappear(ev: WillDisappearEvent<AiProjectSettings>): void {
		this.gate.cancel(ev.action.id);
		this.visible.delete(ev.action.id);
		this.lastImage.delete(ev.action.id);
		this.turnMemory.delete(ev.action.id);
		this.pressGen.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override onKeyDown(ev: KeyDownEvent<AiProjectSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((error) => streamDeck.logger.error(`AI Project capture failed: ${String(error)}`));
		});
	}

	override async onKeyUp(ev: KeyUpEvent<AiProjectSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return;
		await runFocusPress("AI Project", ev.action, () => this.focus(ev.action));
	}

	/**
	 * Every visible key with its settings and the press generation it was read
	 * at, exactly once per tick.
	 *
	 * `gen` is sampled SYNCHRONOUSLY, before this key's settings read is even
	 * started, and that ordering is the whole point. Reading it afterwards — as
	 * an earlier cut of this did, once for all keys after `Promise.all` had
	 * resolved — left a real window: key A's settings can resolve while key B's
	 * is still pending, so a capture on A committing in that gap was already
	 * counted in the generation while `entries` still held A's OLD settings.
	 * The commit check then passed and the pass wrote back the pre-press world.
	 * An independent review of the finished diff caught exactly that.
	 */
	private async readKeys(): Promise<Array<{ key: KeyAction<AiProjectSettings>; settings: AiProjectSettings; gen: number }>> {
		return Promise.all([...this.visible.values()].map(async (key) => {
			const gen = this.pressGen.get(key.id) ?? 0;
			return { key, settings: await key.getSettings(), gen };
		}));
	}

	/** The kinds this tick must scan, derived from the SAME settings read that
	 * will paint the keys — reading twice invites a key whose agent changed in
	 * between being painted from a snapshot that never scanned its kind. */
	private wantedKinds(entries: ReadonlyArray<{ settings: AiProjectSettings }>): AgentKind[] {
		const kinds = new Set<AgentKind>();
		for (const { settings } of entries) {
			if (settings.agent === undefined) return kindsToScan(undefined);
			kinds.add(settings.agent);
		}
		return [...kinds];
	}

	/**
	 * One parallel probe burst instead of a chain: panes, clients, and the
	 * frontmost app all start together; the focused-tty AppleScript (which
	 * used to run strictly AFTER the frontmost-app probe, and after that the
	 * whole agent scan) is chained off the frontmost-app result INSIDE its own
	 * branch, so it overlaps the scan instead of adding to its latency. Pane
	 * titles are handed to {@link scanAgents} as a PROMISE for the same
	 * reason: Claude's working/idle marker lives in the terminal title, so the
	 * scan still needs it, but listing panes and scanning no longer serialize.
	 */
	private async snapshot(
		kinds: readonly AgentKind[],
		opts: { fresh?: boolean; claudeState?: ClaudeStateSelector } = {},
	): Promise<Snapshot> {
		const tmux = findTmuxPath();
		const panesP = runTmux(LIST_AGENT_PANES_ARGS, tmux);
		const clientsP = runTmux(LIST_CLIENTS_ARGS, tmux);
		const frontP = runJxa(FRONT_APP_BUNDLE_JXA);
		// CONTRACT (A6): must never reject — a failed pane listing degrades
		// Claude's title signal to the transcript fallback, never the scan.
		const titlesP = panesP
			.then((r) => (r.ok ? paneTitlesByTty(parseAgentPanes(r.stdout)) : new Map<string, string>()))
			.catch(() => new Map<string, string>());
		const agentsP = scanAgents(kinds, titlesP, undefined, { fresh: opts.fresh, claudeState: opts.claudeState });
		const focusedTtyP = frontP.then(async (front) => {
			const frontBundle = front.ok ? front.stdout.trim() : "";
			if (frontBundle === ITERM_BUNDLE_ID) return (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
			if (frontBundle === TERMINAL_BUNDLE_ID) return (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
			return "";
		});
		const [panesResult, clientsResult, front, focusedTty, agents] = await Promise.all([
			panesP, clientsP, frontP, focusedTtyP, agentsP,
		]);
		const panes = panesResult.ok ? parseAgentPanes(panesResult.stdout) : [];
		const frontBundle = front.ok ? front.stdout.trim() : "";
		return {
			instances: agents.instances,
			panes,
			clientTtys: parseClientTtys(clientsResult.stdout),
			frontBundle,
			focusedTty,
			scanStatus: agents.status,
			failedKinds: agents.failedKinds,
			clientsOk: clientsResult.ok,
			panesOk: panesResult.ok,
		};
	}

	private refreshAll(): Promise<void> { return this.refresher.request(); }

	private async canonicalProject(project: string): Promise<string> {
		const normalized = normalizeProjectPath(expandHome(project, homedir()));
		try { return await realpath(normalized); } catch { return normalized; }
	}

	/**
	 * Is this session holding for the operator? Only asked when the terminal is
	 * the ONLY place that answer exists — Codex records it in its own log and so
	 * never needs scraping, and outside tmux there is no screen we can read.
	 *
	 * `captured` is a Map of PROMISES, not settled results (A4/6d.3): per-key
	 * bodies now run concurrently, so two keys can race to ask for the same
	 * pane in the same tick — storing the promise lets the second one share
	 * the first one's in-flight capture instead of firing a duplicate.
	 */
	private async blockedOnApproval(
		kind: AgentKind,
		host: AgentHost,
		pane: AgentPane | undefined,
		tmux: string,
		captured: Map<string, Promise<{ ok: boolean; text: string }>>,
		panesOk: boolean,
		clientsOk: boolean,
	): Promise<"clear" | "blocked" | "failed"> {
		if (pane === undefined) {
			// A4: "no pane" is ambiguous by itself — see the pure decision this
			// defers to for why panesOk/clientsOk tell it apart from a genuine
			// pane-listing failure.
			return blockedProbeForMissingPane(kind, panesOk, clientsOk);
		}
		if (blockedEvidenceFor(kind, host) !== "terminal") return "clear";
		// Several keys can watch the same pane; capture it once per tick.
		let shotP = captured.get(pane.paneId);
		if (shotP === undefined) {
			shotP = runTmux(captureAgentPaneArgs(pane.paneId), tmux).then((result) => {
				if (!result.ok) streamDeck.logger.warn(`AI Project: capture-pane failed for ${pane.paneId}: ${result.stderr}`);
				return { ok: result.ok, text: result.stdout };
			});
			captured.set(pane.paneId, shotP);
		}
		const shot = await shotP;
		// A probe that errored has NOT told us the agent is unblocked.
		if (!shot.ok) return "failed";
		return paneShowsAgentPrompt(kind, shot.text) ? "blocked" : "clear";
	}

	private async doRefreshAll(): Promise<void> {
		if (this.visible.size === 0) return;
		const entries = await this.readKeys();
		const kinds = this.wantedKinds(entries);

		// Canonicalize each DISTINCT raw project string once (a home-dir
		// realpath, cheap but not free) — doing it per key duplicated the work
		// across every key sharing a project, and doing it AFTER the scan (as
		// this used to) meant the watched-Claude-project set below could not
		// exist yet when the scan needed it.
		const rawProjects = [...new Set(entries.map((e) => (e.settings.project ?? "").trim()))];
		const canonicalByRaw = new Map<string, string>(
			await Promise.all(rawProjects.map(async (raw): Promise<[string, string]> => [raw, await this.canonicalProject(raw)])),
		);

		// Claude alone pays for a transcript read per instance (F4); spend it
		// only on projects a visible key is actually watching. A key bound to
		// Codex or Cursor gets its state for free from the scan itself.
		const watchedClaudeProjects = new Set<string>();
		for (const { settings } of entries) {
			if (settings.agent !== "claude") continue;
			const raw = (settings.project ?? "").trim();
			if (raw === "") continue;
			const canonical = canonicalByRaw.get(raw);
			if (canonical !== undefined && canonical !== "") watchedClaudeProjects.add(normalizeProjectPath(canonical));
		}

		const snap = await this.snapshot(kinds, { claudeState: watchedClaudeProjects });
		const tmux = findTmuxPath();
		this.spin++;
		// One capture-pane per pane per tick, however many keys watch it,
		// shared via its PROMISE — see blockedOnApproval.
		const captured = new Map<string, Promise<{ ok: boolean; text: string }>>();
		const blockedProbes: Array<"clear" | "blocked" | "failed"> = [];
		const unseenActionable: boolean[] = [];

		// Per-key bodies run CONCURRENTLY (F5): each does its own setImage,
		// guarded by the existing lastImage dedupe.
		await Promise.all(entries.map(async ({ key, settings, gen }) => {
			const kind = settings.agent;
			const project = canonicalByRaw.get((settings.project ?? "").trim()) ?? "";
			const sessionId = (settings.sessionId ?? "").trim();
			const mine = kind !== undefined && project !== "" ? agentInstancesFor(snap.instances, kind, project) : [];
			const instance = kind === undefined ? null : selectAgentInstance(snap.instances, kind, project, sessionId);
			const pane = instance === null ? undefined : agentPaneForTty(snap.panes, instance.tty);
			let host: AgentHost = "";
			let hot = false;
			if (instance !== null && pane !== undefined) {
				host = "tmux";
				hot = pane.receivesKeys && snap.focusedTty !== "" && (snap.clientTtys.get(pane.session) ?? []).includes(snap.focusedTty);
			} else if (instance !== null && instance.tty === snap.focusedTty) {
				hot = true;
				host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
			}
			const blockedProbe = instance !== null && kind !== undefined
				? await this.blockedOnApproval(kind, host, pane, tmux, captured, snap.panesOk, snap.clientsOk)
				: "clear" as const;
			blockedProbes.push(blockedProbe);
			const state: AgentState = decideAgentFace({
				kind: kind ?? "claude", // only reached when hasTarget is false
				hasTarget: kind !== undefined && project !== "",
				matchCount: mine.length,
				instanceState: instance?.state ?? null,
				// Only this key's own agent matters: an unrelated kind's probe
				// failing must not gray out a key whose agent was scanned fine.
				scanStatus: kind !== undefined && kindTrusted(snap, kind) ? "ok" : "unknown",
				hasCapturedId: sessionId !== "",
				blockedProbe,
			});
			// A key that disappeared while this pass was awaiting its probes must
			// not have memory written back for it — the entry would outlive the
			// key and be inherited by whatever appears next under that id.
			// A capture or a raise landed after this key's settings were read, so
			// what this pass computed describes a world the operator has already
			// moved past — and a key that vanished mid-pass must not have memory
			// written back for it, or the entry outlives the key.
			if (commitIsStale({ stillVisible: this.visible.get(key.id) === key, genAtRead: gen, genNow: this.pressGen.get(key.id) ?? 0 })) return;
			const binding = agentBindingKey(kind, project, sessionId);
			const memory = trackAgentTurn(this.turnMemory.get(key.id) ?? initialTurnMemory(binding), {
				binding,
				face: state,
				hot,
				// Only an `unknown` caused by two live sessions in one folder should
				// forget the memory; an `unknown` from a failed probe must not, or a
				// transient tmux hiccup would swallow the notification.
				// 0 = nothing selected this tick, which must read as silence rather
				// than as "the process changed" (see AgentTurnMemory.instancePid).
				pid: instance?.pid ?? 0,
				ambiguous: agentUnknownIsAmbiguity({
					scanStatus: kind !== undefined && kindTrusted(snap, kind) ? "ok" : "unknown",
					hasCapturedId: sessionId !== "",
					instanceSelected: instance !== null,
					matchCount: mine.length,
				}),
			});
			this.turnMemory.set(key.id, memory);
			unseenActionable.push(unseenIsActionable(memory, state));
			const image = svgToDataUri(buildAgentProjectKeyImage({
				kind: kind ?? "claude",
				project: kind === undefined ? "hold to teach" : project || "no target",
				host,
				hot,
				state,
				spin: this.spin,
				unseen: memory.unseen,
			}));
			if (this.lastImage.get(key.id) === image) return;
			try { await key.setImage(image); this.lastImage.set(key.id, image); }
			catch (error) { streamDeck.logger.debug(`AI Project image skipped: ${String(error)}`); }
		}));

		// Computed AFTER the per-key pass (F7): needs this tick's blocked-probe
		// verdicts, which only exist once every key has been evaluated.
		this.interesting = agentTickInteresting({
			focusedTty: snap.focusedTty,
			instances: snap.instances,
			blockedProbes,
			unseenActionable: unseenActionable.some(Boolean),
		});
	}

	/**
	 * Record that the operator has dealt with this key: clear its unread mark
	 * and invalidate any refresh pass already in flight for it.
	 *
	 * Takes the key rather than its id so it can check the key is still on
	 * screen. Both callers reach here after several awaits, and without the
	 * check a press that finishes AFTER its key disappeared would write both
	 * maps back and leave entries behind for a key nobody can see.
	 */
	private acknowledge(key: KeyAction<AiProjectSettings>): void {
		if (this.visible.get(key.id) !== key) return;
		this.pressGen.set(key.id, (this.pressGen.get(key.id) ?? 0) + 1);
		const remembered = this.turnMemory.get(key.id);
		if (remembered !== undefined) this.turnMemory.set(key.id, { ...remembered, unseen: false });
	}

	private async raiseTty(tty: string): Promise<boolean> {
		if (await processRunning("iTerm2")) {
			const result = await runAppleScript(buildITermRaiseScript(tty));
			if (result.ok) {
				const focus = parseITermFocusResult(result.stdout);
				if (focus.status === "ok") return true;
				if (focus.status === "timeout") {
					streamDeck.logger.warn(`AI Project iTerm focus timed out: window=${focus.windowId || "?"} tty=${focus.tty || "?"}`);
					return false;
				}
			}
		}
		if (await processRunning(TERMINAL_PROCESS_NAME)) {
			const result = await runAppleScript(buildTerminalRaiseScript(tty));
			if (result.ok && result.stdout.includes("ok")) return true;
		}
		return false;
	}

	private async focus(key: KeyAction<AiProjectSettings>): Promise<void> {
		const settings = await key.getSettings();
		const kind = settings.agent;
		const project = await this.canonicalProject((settings.project ?? "").trim());
		if (kind === undefined || project === "") { await key.showAlert(); return; }
		// A3: settings are what capture() commits, so they are the single source
		// of truth for what this key targets — there used to be a second,
		// separately-written `paintedSession` map read here instead, and making
		// the per-key refresh loop concurrent (above) turned its race with
		// doRefreshAll's writes into a real bug: a refresh that read a key's
		// settings before a capture committed could overwrite paintedSession
		// AFTERWARDS, and focus() would prefer that stale value over the
		// freshly captured one. Reading settings directly has no such race.
		const expected = (settings.sessionId ?? "").trim();
		// `fresh: true` asks every scanner for the machine's state right now,
		// bypassing their shared ~2s caches (and Claude's separate 60s cwd
		// memo) — without it this would act on a view of the world up to a
		// poll old and could raise a window for a session that has already
		// exited. `claudeState: new Set()` skips Claude's transcript read
		// entirely: a raise only needs to know WHICH session is still there,
		// not whether it is working, so there is nothing to buy by paying for
		// that read on the press path.
		const snap = await this.snapshot([kind], { fresh: true, claudeState: new Set() });
		if (!kindTrusted(snap, kind)) {
			streamDeck.logger.warn("AI Project: agent scan unavailable; refusing stale focus.");
			await key.showAlert();
			return;
		}
		const instance = selectAgentInstance(snap.instances, kind, project, expected);
		if (instance === null || (expected !== "" && instance.sessionId !== expected)) {
			streamDeck.logger.warn(`AI Project: ${kind} target missing or ambiguous for ${project}.`);
			await key.showAlert();
			return;
		}
		const pane = agentPaneForTty(snap.panes, instance.tty);
		if (pane !== undefined) {
			const clientTtys = snap.clientTtys.get(pane.session) ?? [];
			const clientTty = chooseClientTty(clientTtys, snap.focusedTty);
			if (clientTty === null) {
				streamDeck.logger.warn(`AI Project: tmux session ${pane.session} has no attached client.`);
				await key.showAlert(); return;
			}
			if (!(await this.raiseTty(clientTty))) { await key.showAlert(); return; }
			const tmux = findTmuxPath();
			for (const args of agentTmuxFocusArgs(pane, clientTty)) {
				const result = await runTmux(args, tmux);
				if (!result.ok) {
					streamDeck.logger.error(`AI Project tmux ${args[0]} failed: ${result.stderr}`);
					await key.showAlert();
					return;
				}
			}
		} else if (!(await this.raiseTty(instance.tty))) {
			await key.showAlert();
			return;
		}
		// The raise succeeded, so the operator IS at that session now — that is
		// the unread mark's dismissal condition, and waiting for a later poll to
		// infer it would leave the mark showing on a key the operator just went
		// to. This runs BEFORE showOk deliberately: showOk is cosmetic deck
		// feedback, and letting it fail would otherwise swallow the
		// acknowledgement of a raise that demonstrably worked.
		this.acknowledge(key);
		void this.refreshAll();
		setTimeout(() => void this.refreshAll(), 450);
		await key.showOk();
	}

	/**
	 * Work out which agent the operator is looking at. The frontmost terminal
	 * reports the tty of its focused session; under tmux that is the CLIENT's
	 * tty, not the agent's, so it is translated through the attached session to
	 * whichever pane would receive keystrokes.
	 */
	private resolveCapture(snap: Snapshot): AgentInstance | null {
		// tmux FIRST. A client's tty is the terminal's own, so an agent that was
		// started in that terminal and then suspended (Ctrl-Z, then `tmux
		// attach`) still owns the tty — and would otherwise be captured in
		// preference to the agent actually on screen in the active pane.
		for (const [session, clientTtys] of snap.clientTtys) {
			if (!clientTtys.includes(snap.focusedTty)) continue;
			const pane = snap.panes.find((p) => p.session === session && p.receivesKeys);
			return pane === undefined ? null : agentForFocusedTty(snap.instances, pane.tty);
		}
		// Not a tmux client: the frontmost terminal hosts the agent directly. A
		// tty CAN still host two agents — one launched from inside another's
		// terminal inherits it — so more than one match is ambiguous, not a
		// choice to make on the operator's behalf.
		return agentForFocusedTty(snap.instances, snap.focusedTty);
	}

	private async capture(key: KeyAction<AiProjectSettings>): Promise<void> {
		// Capture must consider every kind — this is the one gesture that does
		// not yet know which agent it is dealing with.
		// Capture must consider every kind, and every kind must have answered:
		// binding to the wrong agent is not recoverable by looking again.
		// `fresh: true` asks the machine now rather than acting on a snapshot
		// up to a poll old.
		const snap = await this.snapshot(kindsToScan(undefined), { fresh: true });
		if (snap.scanStatus !== "ok" || snap.focusedTty === "") { await key.showAlert(); return; }
		// tmux is clearly alive (it listed panes) but would not list its clients,
		// so the client->pane translation below cannot run. Falling back to the
		// raw tty would reintroduce exactly the miscapture that translation
		// exists to prevent: a suspended agent sharing the terminal's tty.
		if (!snap.clientsOk && snap.panes.length > 0) {
			streamDeck.logger.warn("AI Project: tmux listed panes but not clients; refusing an ambiguous capture.");
			await key.showAlert();
			return;
		}
		const instance = this.resolveCapture(snap);
		if (instance === null) { await key.showAlert(); return; }
		// Refuse a capture that would not survive its own first refresh. Claude
		// has no session id, so two Claude sessions in one folder are
		// indistinguishable afterwards: storing the binding would flash "ok" and
		// then leave the key permanently ambiguous. Better to decline the gesture
		// than to accept it and quietly not work.
		// Compare using the SAME canonical form refresh will use, or the guard
		// tests an identity the key never actually looks up.
		const project = await this.canonicalProject(instance.cwd);
		if (selectAgentInstance(snap.instances, instance.kind, project, instance.sessionId) === null) {
			streamDeck.logger.warn(
				`AI Project: refusing capture — ${instance.kind} in ${instance.cwd} cannot be told apart from another session there.`,
			);
			await key.showAlert();
			return;
		}
		const settings = await key.getSettings();
		await key.setSettings({ ...settings, agent: instance.kind, project, sessionId: instance.sessionId });
		// The new binding gives the key a fresh memory on its next commit; this
		// additionally drops any commit from a pass that read the OLD settings
		// and has not finished, which the binding alone cannot do. Before
		// showOk for the same reason as in focus(): the capture has already been
		// committed to settings, so cosmetic feedback failing must not leave the
		// in-flight pass free to write the old target back.
		this.acknowledge(key);
		await key.showOk();
		await this.refreshAll();
	}
}
