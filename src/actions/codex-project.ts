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
import { scanCodexSnapshot } from "../mac/codex-scan.js";
import {
	buildCodexProjectKeyImage,
	type CodexHost,
	type CodexInstance,
	type CodexPane,
	codexInstancesForProject,
	codexTmuxFocusArgs,
	LIST_CODEX_PANES_ARGS,
	normalizeProjectPath,
	parseCodexPanes,
	selectCodexInstance,
} from "../mac/codex-project.js";
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

type CodexProjectSettings = {
	project?: string;
	/** Stable rollout session UUID captured by the teaching gesture. */
	sessionId?: string;
};

interface Snapshot {
	instances: CodexInstance[];
	panes: CodexPane[];
	clientTtys: Map<string, string[]>;
	frontBundle: string;
	focusedTty: string;
	scanStatus: "ok" | "unknown";
}

const POLL_MS = 2500;

/** Live key for one interactive Codex CLI session/project. */
@action({ UUID: "com.movingavg.switchboard.codexproject" })
export class CodexProject extends SingletonAction<CodexProjectSettings> {
	private readonly gate = new PressGate();
	private readonly visible = new Map<string, KeyAction<CodexProjectSettings>>();
	private readonly lastImage = new Map<string, string>();
	/** Identity used for the currently painted face; press must revalidate it. */
	private readonly paintedSession = new Map<string, string>();
	private readonly refresher = new CoalescedRunner(() => this.doRefreshAll());
	private timer?: ReturnType<typeof setInterval>;
	private spin = 0;
	private tick = 0;
	private interesting = true;

	override async onWillAppear(ev: WillAppearEvent<CodexProjectSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => {
				if (shouldPollThisTick(this.tick++, this.interesting)) void this.refreshAll();
			}, POLL_MS);
		}
		await this.refreshAll();
	}

	override onWillDisappear(ev: WillDisappearEvent<CodexProjectSettings>): void {
		this.gate.cancel(ev.action.id);
		this.visible.delete(ev.action.id);
		this.lastImage.delete(ev.action.id);
		this.paintedSession.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override onKeyDown(ev: KeyDownEvent<CodexProjectSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((error) => streamDeck.logger.error(`Codex Project capture failed: ${String(error)}`));
		});
	}

	override async onKeyUp(ev: KeyUpEvent<CodexProjectSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return;
		await runExclusive("iterm-focus", () => this.focus(ev.action));
	}

	private async snapshot(): Promise<Snapshot> {
		const tmux = findTmuxPath();
		const [codex, panesResult, clientsResult, front] = await Promise.all([
			scanCodexSnapshot(),
			runTmux(LIST_CODEX_PANES_ARGS, tmux),
			runTmux(LIST_CLIENTS_ARGS, tmux),
			runJxa(FRONT_APP_BUNDLE_JXA),
		]);
		const frontBundle = front.ok ? front.stdout.trim() : "";
		let focusedTty = "";
		if (frontBundle === ITERM_BUNDLE_ID) focusedTty = (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
		else if (frontBundle === TERMINAL_BUNDLE_ID) focusedTty = (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
		return {
			instances: codex.instances,
			panes: panesResult.ok ? parseCodexPanes(panesResult.stdout) : [],
			clientTtys: parseClientTtys(clientsResult.stdout),
			frontBundle,
			focusedTty,
			scanStatus: codex.status,
		};
	}

	private refreshAll(): Promise<void> { return this.refresher.request(); }

	private async canonicalProject(project: string): Promise<string> {
		const normalized = normalizeProjectPath(expandHome(project, homedir()));
		try { return await realpath(normalized); } catch { return normalized; }
	}

	private async doRefreshAll(): Promise<void> {
		if (this.visible.size === 0) return;
		const snap = await this.snapshot();
		this.spin++;
		this.interesting = snap.focusedTty !== "" || snap.instances.some((i) => i.state === "working" || i.state === "blocked");
		for (const key of this.visible.values()) {
			const settings = await key.getSettings();
			const project = await this.canonicalProject((settings.project ?? "").trim());
			const mine = project ? codexInstancesForProject(snap.instances, project) : [];
			const instance = selectCodexInstance(mine, project, (settings.sessionId ?? "").trim());
			if (instance === null) this.paintedSession.delete(key.id);
			else this.paintedSession.set(key.id, instance.sessionId);
			const pane = instance === null ? undefined : snap.panes.find((p) => p.tty === instance.tty);
			let host: CodexHost = "";
			let hot = false;
			if (instance !== null && pane !== undefined) {
				host = "tmux";
				hot = pane.receivesKeys && snap.focusedTty !== "" && (snap.clientTtys.get(pane.session) ?? []).includes(snap.focusedTty);
			} else if (instance !== null && instance.tty === snap.focusedTty) {
				hot = true;
				host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
			}
			const state = mine.length > 1 && instance === null
				? "unknown"
				: instance?.state ?? (project !== "" && snap.scanStatus === "unknown" ? "unknown" : "none");
			const image = svgToDataUri(buildCodexProjectKeyImage({ project: project || "no target", host, hot, state, spin: this.spin }));
			if (this.lastImage.get(key.id) === image) continue;
			try { await key.setImage(image); this.lastImage.set(key.id, image); }
			catch (error) { streamDeck.logger.debug(`Codex Project image skipped: ${String(error)}`); }
		}
	}

	private async raiseTty(tty: string): Promise<boolean> {
		if (await processRunning("iTerm2")) {
			const result = await runAppleScript(buildITermRaiseScript(tty));
			if (result.ok) {
				const focus = parseITermFocusResult(result.stdout);
				if (focus.status === "ok") return true;
				if (focus.status === "timeout") {
					streamDeck.logger.warn(`Codex Project iTerm focus timed out: window=${focus.windowId || "?"} tty=${focus.tty || "?"}`);
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

	private async focus(key: KeyAction<CodexProjectSettings>): Promise<void> {
		const settings = await key.getSettings();
		const project = await this.canonicalProject((settings.project ?? "").trim());
		if (project === "") { await key.showAlert(); return; }
		const expected = this.paintedSession.get(key.id) ?? (settings.sessionId ?? "");
		const snap = await this.snapshot();
		if (snap.scanStatus !== "ok") {
			streamDeck.logger.warn("Codex Project: process scan unavailable; refusing stale focus.");
			await key.showAlert();
			return;
		}
		const instance = selectCodexInstance(snap.instances, project, expected);
		if (instance === null || (expected !== "" && instance.sessionId !== expected)) {
			streamDeck.logger.warn(`Codex Project: target missing or ambiguous for ${project}.`);
			await key.showAlert();
			return;
		}
		const pane = snap.panes.find((p) => p.tty === instance.tty);
		if (pane !== undefined) {
			const clientTtys = snap.clientTtys.get(pane.session) ?? [];
			const clientTty = chooseClientTty(clientTtys, snap.focusedTty);
			if (clientTty === null) {
				streamDeck.logger.warn(`Codex Project: tmux session ${pane.session} has no attached client.`);
				await key.showAlert(); return;
			}
			if (clientTtys.length > 1) streamDeck.logger.debug(`Codex Project: chose ${clientTty} from ${clientTtys.length} clients for ${pane.session}.`);
			if (!(await this.raiseTty(clientTty))) { await key.showAlert(); return; }
			const tmux = findTmuxPath();
			for (const args of codexTmuxFocusArgs(pane, clientTty)) {
				const result = await runTmux(args, tmux);
				if (!result.ok) {
					streamDeck.logger.error(`Codex Project tmux ${args[0]} failed: ${result.stderr}`);
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

	private async capture(key: KeyAction<CodexProjectSettings>): Promise<void> {
		const snap = await this.snapshot();
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
