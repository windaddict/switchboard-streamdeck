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
	agentForFocusedTty,
	type AgentHost,
	type AgentInstance,
	type AgentKind,
	type AgentState,
	blockedEvidenceFor,
	buildAgentProjectKeyImage,
	decideAgentFace,
	paneShowsAgentPrompt,
} from "../mac/agent-project.js";
import {
	type AgentPane,
	agentInstancesFor,
	agentPaneForTty,
	agentTmuxFocusArgs,
	captureAgentPaneArgs,
	invalidateAgentScans,
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
import { runExclusive } from "../mac/serialize.js";
import { findTmuxPath, LIST_CLIENTS_ARGS, runTmux } from "../mac/tmux-runner.js";
import {
	buildTerminalRaiseScript,
	TERMINAL_BUNDLE_ID,
	TERMINAL_FOCUSED_TTY_SCRIPT,
	TERMINAL_PROCESS_NAME,
} from "../mac/terminal.js";
import { processRunning } from "../mac/claude-scan.js";
import { expandHome } from "../mac/files.js";

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
	/** Session identity the last refresh RESOLVED for this key. A press treats
	 * it as a hint only — focus() revalidates against a fresh scan. */
	private readonly paintedSession = new Map<string, string>();
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
		this.paintedSession.delete(ev.action.id);
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
		await runExclusive("iterm-focus", () => this.focus(ev.action));
	}

	/** Every visible key with its settings, read exactly once per tick. */
	private async readKeys(): Promise<Array<{ key: KeyAction<AiProjectSettings>; settings: AiProjectSettings }>> {
		return Promise.all([...this.visible.values()].map(async (key) => ({ key, settings: await key.getSettings() })));
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

	private async snapshot(kinds: readonly AgentKind[]): Promise<Snapshot> {
		const tmux = findTmuxPath();
		const [panesResult, clientsResult, front] = await Promise.all([
			runTmux(LIST_AGENT_PANES_ARGS, tmux),
			runTmux(LIST_CLIENTS_ARGS, tmux),
			runJxa(FRONT_APP_BUNDLE_JXA),
		]);
		const panes = panesResult.ok ? parseAgentPanes(panesResult.stdout) : [];
		// Pane titles must be gathered BEFORE scanning: Claude's working/idle
		// marker lives in its terminal title and the scan cannot see it.
		const agents = await scanAgents(kinds, paneTitlesByTty(panes));
		const frontBundle = front.ok ? front.stdout.trim() : "";
		let focusedTty = "";
		if (frontBundle === ITERM_BUNDLE_ID) focusedTty = (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
		else if (frontBundle === TERMINAL_BUNDLE_ID) focusedTty = (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
		return {
			instances: agents.instances,
			panes,
			clientTtys: parseClientTtys(clientsResult.stdout),
			frontBundle,
			focusedTty,
			scanStatus: agents.status,
			failedKinds: agents.failedKinds,
			clientsOk: clientsResult.ok,
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
	 */
	private async blockedOnApproval(
		kind: AgentKind,
		host: AgentHost,
		pane: AgentPane | undefined,
		tmux: string,
		captured: Map<string, { ok: boolean; text: string }>,
	): Promise<"clear" | "blocked" | "failed"> {
		// "clear" is the honest answer where the question does not arise: Codex
		// records blocking in its own log, and outside tmux there is no screen to
		// read — neither is a FAILED probe.
		if (pane === undefined || blockedEvidenceFor(kind, host) !== "terminal") return "clear";
		// Several keys can watch the same pane; capture it once per tick.
		let shot = captured.get(pane.paneId);
		if (shot === undefined) {
			const result = await runTmux(captureAgentPaneArgs(pane.paneId), tmux);
			shot = { ok: result.ok, text: result.stdout };
			captured.set(pane.paneId, shot);
			if (!result.ok) streamDeck.logger.warn(`AI Project: capture-pane failed for ${pane.paneId}: ${result.stderr}`);
		}
		// A probe that errored has NOT told us the agent is unblocked.
		if (!shot.ok) return "failed";
		return paneShowsAgentPrompt(kind, shot.text) ? "blocked" : "clear";
	}

	private async doRefreshAll(): Promise<void> {
		if (this.visible.size === 0) return;
		const entries = await this.readKeys();
		const snap = await this.snapshot(this.wantedKinds(entries));
		const tmux = findTmuxPath();
		this.spin++;
		this.interesting = snap.focusedTty !== "" || snap.instances.some((i) => i.state === "working" || i.state === "blocked");
		// One capture-pane per pane per tick, however many keys watch it.
		const captured = new Map<string, { ok: boolean; text: string }>();
		for (const { key, settings } of entries) {
			const kind = settings.agent;
			const project = await this.canonicalProject((settings.project ?? "").trim());
			const sessionId = (settings.sessionId ?? "").trim();
			const mine = kind !== undefined && project !== "" ? agentInstancesFor(snap.instances, kind, project) : [];
			const instance = kind === undefined ? null : selectAgentInstance(snap.instances, kind, project, sessionId);
			if (instance === null) this.paintedSession.delete(key.id);
			else this.paintedSession.set(key.id, instance.sessionId);
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
				? await this.blockedOnApproval(kind, host, pane, tmux, captured)
				: "clear" as const;
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
			const image = svgToDataUri(buildAgentProjectKeyImage({
				kind: kind ?? "claude",
				project: kind === undefined ? "hold to teach" : project || "no target",
				host,
				hot,
				state,
				spin: this.spin,
			}));
			if (this.lastImage.get(key.id) === image) continue;
			try { await key.setImage(image); this.lastImage.set(key.id, image); }
			catch (error) { streamDeck.logger.debug(`AI Project image skipped: ${String(error)}`); }
		}
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
		const expected = this.paintedSession.get(key.id) ?? (settings.sessionId ?? "");
		// Genuinely fresh: every scanner caches for ~2s, so without dropping those
		// caches first this would act on a view of the world up to a poll old and
		// could raise a window for a session that has already exited.
		invalidateAgentScans([kind]);
		const snap = await this.snapshot([kind]);
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
		await key.showOk();
		setTimeout(() => void this.refreshAll(), 450);
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
		invalidateAgentScans(kindsToScan(undefined));
		const snap = await this.snapshot(kindsToScan(undefined));
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
		this.paintedSession.set(key.id, instance.sessionId);
		await key.showOk();
		await this.refreshAll();
	}
}
