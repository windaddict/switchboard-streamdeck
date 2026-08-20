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
import { invalidateCursorScan, scanCursorSnapshot } from "../mac/cursor-scan.js";
import {
	buildCursorProjectKeyImage,
	capturePaneArgs,
	type CursorHost,
	type CursorInstance,
	type CursorPane,
	type CursorState,
	cursorInstancesForProject,
	cursorTmuxFocusArgs,
	decideCursorFace,
	LIST_CURSOR_PANES_ARGS,
	normalizeProjectPath,
	paneForTty,
	paneShowsApprovalPrompt,
	parseCursorPanes,
	selectCursorInstance,
} from "../mac/cursor-project.js";
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

type CursorProjectSettings = {
	project?: string;
	/** Stable chat-session UUID captured by the teaching gesture. */
	sessionId?: string;
};

interface Snapshot {
	instances: CursorInstance[];
	panes: CursorPane[];
	clientTtys: Map<string, string[]>;
	frontBundle: string;
	focusedTty: string;
	scanStatus: "ok" | "unknown";
}

const POLL_MS = 2500;

/** Live key for one interactive Cursor CLI session/project. */
@action({ UUID: "com.movingavg.switchboard.cursorproject" })
export class CursorProject extends SingletonAction<CursorProjectSettings> {
	private readonly gate = new PressGate();
	private readonly visible = new Map<string, KeyAction<CursorProjectSettings>>();
	private readonly lastImage = new Map<string, string>();
	/** Session identity the last refresh RESOLVED for this key (set even if the
	 * subsequent setImage was skipped). A press treats it as a hint only — focus()
	 * revalidates it against a fresh scan before acting. */
	private readonly paintedSession = new Map<string, string>();
	private readonly refresher = new CoalescedRunner(() => this.doRefreshAll());
	private timer?: ReturnType<typeof setInterval>;
	private spin = 0;
	private tick = 0;
	private interesting = true;

	override async onWillAppear(ev: WillAppearEvent<CursorProjectSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => {
				if (shouldPollThisTick(this.tick++, this.interesting)) void this.refreshAll();
			}, POLL_MS);
		}
		await this.refreshAll();
	}

	override onWillDisappear(ev: WillDisappearEvent<CursorProjectSettings>): void {
		this.gate.cancel(ev.action.id);
		this.visible.delete(ev.action.id);
		this.lastImage.delete(ev.action.id);
		this.paintedSession.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override onKeyDown(ev: KeyDownEvent<CursorProjectSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((error) => streamDeck.logger.error(`Cursor Project capture failed: ${String(error)}`));
		});
	}

	override async onKeyUp(ev: KeyUpEvent<CursorProjectSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return;
		await runExclusive("iterm-focus", () => this.focus(ev.action));
	}

	private async snapshot(): Promise<Snapshot> {
		const tmux = findTmuxPath();
		const [cursor, panesResult, clientsResult, front] = await Promise.all([
			scanCursorSnapshot(),
			runTmux(LIST_CURSOR_PANES_ARGS, tmux),
			runTmux(LIST_CLIENTS_ARGS, tmux),
			runJxa(FRONT_APP_BUNDLE_JXA),
		]);
		const frontBundle = front.ok ? front.stdout.trim() : "";
		let focusedTty = "";
		if (frontBundle === ITERM_BUNDLE_ID) focusedTty = (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
		else if (frontBundle === TERMINAL_BUNDLE_ID) focusedTty = (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
		return {
			instances: cursor.instances,
			panes: panesResult.ok ? parseCursorPanes(panesResult.stdout) : [],
			clientTtys: parseClientTtys(clientsResult.stdout),
			frontBundle,
			focusedTty,
			scanStatus: cursor.status,
		};
	}

	/** A snapshot taken deliberately fresh, for the moment a press acts on it —
	 * the cached one may be up to a poll old, and a window raise must not be
	 * aimed at a session that has since exited or moved. */
	private freshSnapshot(): Promise<Snapshot> {
		invalidateCursorScan();
		return this.snapshot();
	}

	private refreshAll(): Promise<void> { return this.refresher.request(); }

	private async canonicalProject(project: string): Promise<string> {
		const normalized = normalizeProjectPath(expandHome(project, homedir()));
		try { return await realpath(normalized); } catch { return normalized; }
	}

	/**
	 * Is this session holding for the operator's approval? Nothing Cursor
	 * writes to disk separates that from ordinary work, so the terminal itself
	 * is the only evidence — which means the answer is available for
	 * tmux-hosted sessions only. Anything unrecognised leaves the state as
	 * `working`, so a wording change can never manufacture a false alarm.
	 */
	private async blockedOnApproval(pane: CursorPane, tmux: string): Promise<boolean> {
		const result = await runTmux(capturePaneArgs(pane.paneId), tmux);
		if (!result.ok) {
			streamDeck.logger.debug(`Cursor Project: capture-pane failed for ${pane.paneId}: ${result.stderr}`);
			return false;
		}
		return paneShowsApprovalPrompt(result.stdout);
	}

	private async doRefreshAll(): Promise<void> {
		if (this.visible.size === 0) return;
		const snap = await this.snapshot();
		const tmux = findTmuxPath();
		this.spin++;
		this.interesting = snap.focusedTty !== "" || snap.instances.some((i) => i.state === "working");
		for (const key of this.visible.values()) {
			const settings = await key.getSettings();
			const project = await this.canonicalProject((settings.project ?? "").trim());
			const mine = project ? cursorInstancesForProject(snap.instances, project) : [];
			const instance = selectCursorInstance(mine, project, (settings.sessionId ?? "").trim());
			if (instance === null) this.paintedSession.delete(key.id);
			else this.paintedSession.set(key.id, instance.sessionId);
			const pane = instance === null ? undefined : paneForTty(snap.panes, instance.tty);
			let host: CursorHost = "";
			let hot = false;
			if (instance !== null && pane !== undefined) {
				host = "tmux";
				hot = pane.receivesKeys && snap.focusedTty !== "" && (snap.clientTtys.get(pane.session) ?? []).includes(snap.focusedTty);
			} else if (instance !== null && instance.tty === snap.focusedTty) {
				hot = true;
				host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
			}
			// Scraping the pane costs a tmux call, so only ask when the answer could
			// change the face: an in-flight turn hosted in a pane we can read.
			const blockedOnPane = instance !== null && instance.state === "working" && pane !== undefined
				&& await this.blockedOnApproval(pane, tmux);
			const state: CursorState = decideCursorFace({
				hasTarget: project !== "",
				matchCount: mine.length,
				instanceState: instance?.state ?? null,
				scanStatus: snap.scanStatus,
				hasCapturedId: (settings.sessionId ?? "").trim() !== "",
				blockedOnPane,
			});
			const image = svgToDataUri(buildCursorProjectKeyImage({ project: project || "no target", host, hot, state, spin: this.spin }));
			if (this.lastImage.get(key.id) === image) continue;
			try { await key.setImage(image); this.lastImage.set(key.id, image); }
			catch (error) { streamDeck.logger.debug(`Cursor Project image skipped: ${String(error)}`); }
		}
	}

	private async raiseTty(tty: string): Promise<boolean> {
		if (await processRunning("iTerm2")) {
			const result = await runAppleScript(buildITermRaiseScript(tty));
			if (result.ok) {
				const focus = parseITermFocusResult(result.stdout);
				if (focus.status === "ok") return true;
				if (focus.status === "timeout") {
					streamDeck.logger.warn(`Cursor Project iTerm focus timed out: window=${focus.windowId || "?"} tty=${focus.tty || "?"}`);
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

	private async focus(key: KeyAction<CursorProjectSettings>): Promise<void> {
		const settings = await key.getSettings();
		const project = await this.canonicalProject((settings.project ?? "").trim());
		if (project === "") { await key.showAlert(); return; }
		const expected = this.paintedSession.get(key.id) ?? (settings.sessionId ?? "");
		const snap = await this.freshSnapshot();
		if (snap.scanStatus !== "ok") {
			streamDeck.logger.warn("Cursor Project: process scan unavailable; refusing stale focus.");
			await key.showAlert();
			return;
		}
		const instance = selectCursorInstance(snap.instances, project, expected);
		if (instance === null || (expected !== "" && instance.sessionId !== expected)) {
			streamDeck.logger.warn(`Cursor Project: target missing or ambiguous for ${project}.`);
			await key.showAlert();
			return;
		}
		const pane = paneForTty(snap.panes, instance.tty);
		if (pane !== undefined) {
			const clientTtys = snap.clientTtys.get(pane.session) ?? [];
			const clientTty = chooseClientTty(clientTtys, snap.focusedTty);
			if (clientTty === null) {
				streamDeck.logger.warn(`Cursor Project: tmux session ${pane.session} has no attached client.`);
				await key.showAlert(); return;
			}
			if (clientTtys.length > 1) streamDeck.logger.debug(`Cursor Project: chose ${clientTty} from ${clientTtys.length} clients for ${pane.session}.`);
			if (!(await this.raiseTty(clientTty))) { await key.showAlert(); return; }
			const tmux = findTmuxPath();
			for (const args of cursorTmuxFocusArgs(pane, clientTty)) {
				const result = await runTmux(args, tmux);
				if (!result.ok) {
					streamDeck.logger.error(`Cursor Project tmux ${args[0]} failed: ${result.stderr}`);
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

	private async capture(key: KeyAction<CursorProjectSettings>): Promise<void> {
		const snap = await this.freshSnapshot();
		if (snap.scanStatus !== "ok" || snap.focusedTty === "") { await key.showAlert(); return; }
		let instance = snap.instances.find((i) => i.tty === snap.focusedTty);
		if (instance === undefined) {
			for (const [session, clientTtys] of snap.clientTtys) {
				if (!clientTtys.includes(snap.focusedTty)) continue;
				const pane = snap.panes.find((p) => p.session === session && p.receivesKeys);
				if (pane !== undefined) instance = snap.instances.find((i) => i.tty === pane.tty);
				break;
			}
		}
		if (instance === undefined) { await key.showAlert(); return; }
		const settings = await key.getSettings();
		await key.setSettings({ ...settings, project: instance.cwd, sessionId: instance.sessionId });
		this.paintedSession.set(key.id, instance.sessionId);
		await key.showOk();
		await this.refreshAll();
	}
}
