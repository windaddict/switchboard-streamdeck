import streamDeck, {
	action,
	type KeyAction,
	type KeyDownEvent,
	type KeyUpEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { runAppleScript, runJxa } from "../applescript/runner.js";
import { CoalescedRunner, shouldPollThisTick } from "../mac/coalesce.js";
import { FRONT_APP_BUNDLE_JXA } from "../mac/app-windows.js";
import {
	buildClaudeProjectKeyImage,
	type ClaudeHost,
	type ClaudeInstance,
	instancesForProject,
	projectClaudeState,
} from "../mac/claude-project.js";
import { processRunning, scanClaudeInstances } from "../mac/claude-scan.js";
import {
	LIST_PANE_TTYS_ARGS,
	type PaneTty,
	parsePaneTtys,
	titleWorking,
} from "../mac/claude-state.js";
import { newestTranscriptState } from "../mac/claude-transcript.js";
import { buildITermRaiseScript, ITERM_BUNDLE_ID, ITERM_FOCUSED_TTY_SCRIPT } from "../mac/iterm.js";
import { PressGate } from "../mac/press-gate.js";
import { svgToDataUri } from "../mac/svg.js";
import { parseClients } from "../mac/tmux.js";
import { findTmuxPath, LIST_CLIENTS_ARGS, runTmux } from "../mac/tmux-runner.js";
import {
	buildTerminalRaiseScript,
	TERMINAL_BUNDLE_ID,
	TERMINAL_FOCUSED_TTY_SCRIPT,
	TERMINAL_PROCESS_NAME,
} from "../mac/terminal.js";

type ClaudeProjectSettings = {
	/** Absolute path of the project directory this key watches. */
	project?: string;
};

/** How often the key faces re-check the live state. */
const POLL_MS = 2500;

/** One tick's shared view of the world, evaluated per visible key. */
interface Snapshot {
	instances: ClaudeInstance[];
	panes: PaneTty[];
	/** tmux session -> attached client tty. */
	clients: Map<string, string>;
	frontBundle: string;
	/** tty of the focused iTerm session / Terminal tab ("" when unknown). */
	focusedTty: string;
}

/**
 * Live key face for a Claude Code PROJECT, host-independent: works whether
 * the session runs under tmux, plain iTerm2, or Terminal.app. The face shows
 * the project name, whether keystrokes would land in that session (status
 * bar), and the Claude spark (amber turning = working, white still = waiting;
 * dashed bar = no claude running there). Press raises the hosting window —
 * tmux-hosted instances sit on tmux pane ttys that iTerm/Terminal have never
 * heard of, so those route through the tmux raise machinery. Hold to capture
 * the frontmost session's project ("teach the button").
 */
@action({ UUID: "com.movingavg.switchboard.claudeproject" })
export class ClaudeProject extends SingletonAction<ClaudeProjectSettings> {
	private readonly gate = new PressGate();
	private readonly visible = new Map<string, KeyAction<ClaudeProjectSettings>>();
	private timer?: ReturnType<typeof setInterval>;
	private readonly refresher = new CoalescedRunner(() => this.doRefreshAll());
	private spin = 0;
	private tick = 0;
	/** Last tick saw a frontmost terminal / hot key / working Claude. */
	private interesting = true;
	private readonly lastImage = new Map<string, string>();

	override async onWillAppear(ev: WillAppearEvent<ClaudeProjectSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => {
				if (shouldPollThisTick(this.tick++, this.interesting)) void this.refreshAll();
			}, POLL_MS);
		}
		await this.refreshAll();
	}

	override onWillDisappear(ev: WillDisappearEvent<ClaudeProjectSettings>): void {
		this.gate.cancel(ev.action.id);
		this.visible.delete(ev.action.id);
		this.lastImage.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override onKeyDown(ev: KeyDownEvent<ClaudeProjectSettings>): void {
		this.gate.down(ev.action.id, () => {
			void this.capture(ev.action).catch((err) =>
				streamDeck.logger.error(`Claude Project capture failed: ${String(err)}`),
			);
		});
	}

	override async onKeyUp(ev: KeyUpEvent<ClaudeProjectSettings>): Promise<void> {
		if (!this.gate.up(ev.action.id)) return; // long press already captured
		await this.focus(ev.action);
	}

	/** One query set per tick: process scan, tmux pane/client maps, frontmost
	 * app + its focused tty. Transcript freshness is checked per project. */
	private async snapshot(): Promise<Snapshot> {
		const tmux = findTmuxPath();
		const [instances, panesRes, clientsRes, front] = await Promise.all([
			scanClaudeInstances(),
			runTmux(LIST_PANE_TTYS_ARGS, tmux),
			runTmux(LIST_CLIENTS_ARGS, tmux),
			runJxa(FRONT_APP_BUNDLE_JXA),
		]);
		const frontBundle = front.ok ? front.stdout.trim() : "";

		// Only address a terminal app that is FRONTMOST (addressing via
		// AppleScript would launch it; frontmost implies running).
		let focusedTty = "";
		if (frontBundle === ITERM_BUNDLE_ID) {
			focusedTty = (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
		} else if (frontBundle === TERMINAL_BUNDLE_ID) {
			focusedTty = (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
		}

		return {
			instances,
			panes: panesRes.ok ? parsePaneTtys(panesRes.stdout) : [],
			clients: parseClients(clientsRes.stdout),
			frontBundle,
			focusedTty,
		};
	}

	/** Coalesced — see focus-tmux: explicit repaints must never be dropped. */
	private refreshAll(): Promise<void> {
		return this.refresher.request();
	}

	private async doRefreshAll(): Promise<void> {
		if (this.visible.size === 0) return;
		{
			const snap = await this.snapshot();
			this.spin++;
			this.interesting = snap.focusedTty !== "" || snap.instances.some((i) => i.shellBusy);

			for (const key of this.visible.values()) {
				const settings = await key.getSettings();
				const project = (settings.project ?? "").trim();
				const image = await this.renderKey(project, snap);
				if (this.lastImage.get(key.id) === image) continue;
				try {
					await key.setImage(image);
					this.lastImage.set(key.id, image);
				} catch (err) {
					streamDeck.logger.debug(`Claude Project image skipped: ${String(err)}`);
				}
			}
		}
	}

	private async renderKey(project: string, snap: Snapshot): Promise<string> {
		const mine = project ? instancesForProject(snap.instances, project) : [];
		const pane = this.paneFor(mine, snap.panes);
		const instance = pane.instance ?? mine[0];

		let host: ClaudeHost = "";
		let hot = false;
		let title: boolean | null = null;

		if (instance !== undefined) {
			if (pane.pane !== undefined) {
				host = "tmux";
				title = titleWorking(pane.pane.title);
				// Keystrokes land there when the pane would receive its session's
				// keys AND that session's client is the focused iTerm session.
				hot =
					pane.pane.receivesKeys &&
					snap.focusedTty !== "" &&
					snap.clients.get(pane.pane.session) === snap.focusedTty;
			} else {
				hot = snap.focusedTty !== "" && instance.tty === snap.focusedTty;
				if (hot) {
					host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
				}
			}
		}

		const transcript =
			instance !== undefined
				? await newestTranscriptState(project)
				: { ageMs: null, working: false };
		const claude = projectClaudeState({
			present: instance !== undefined,
			titleWorking: title,
			transcriptAgeMs: transcript.ageMs,
			transcriptWorking: transcript.working,
			shellBusy: instance?.shellBusy === true,
		});

		return svgToDataUri(
			buildClaudeProjectKeyImage({
				project: project || "no target",
				host,
				hot,
				claude,
				spin: this.spin,
			}),
		);
	}

	/** The project's tmux-hosted instance and its pane, if any. */
	private paneFor(
		mine: ClaudeInstance[],
		panes: PaneTty[],
	): { instance?: ClaudeInstance; pane?: PaneTty } {
		for (const instance of mine) {
			const pane = panes.find((p) => p.tty === instance.tty);
			if (pane !== undefined) return { instance, pane };
		}
		return { instance: mine[0] };
	}

	/** Short press: raise whatever window hosts the project's session. */
	private async focus(key: KeyAction<ClaudeProjectSettings>): Promise<void> {
		const settings = await key.getSettings();
		const project = (settings.project ?? "").trim();
		if (!project) {
			streamDeck.logger.warn("Claude Project pressed with no project configured.");
			await key.showAlert();
			return;
		}

		// Resolve FRESH at press time — never from the poll cache.
		const snap = await this.snapshot();
		const mine = instancesForProject(snap.instances, project);
		if (mine.length === 0) {
			streamDeck.logger.warn(`Claude Project: no claude running in ${project}.`);
			await key.showAlert();
			return;
		}
		const { instance, pane } = this.paneFor(mine, snap.panes);
		const target = instance ?? mine[0];

		if (pane !== undefined) {
			// tmux-hosted: raise the hosting iTerm window by CLIENT tty, then
			// switch tmux to the exact window.
			const clientTty = snap.clients.get(pane.session);
			const raise = await runAppleScript(
				clientTty ? buildITermRaiseScript(clientTty) : 'tell application "iTerm" to activate',
			);
			if (!raise.ok) {
				streamDeck.logger.error(`Claude Project raise failed (${raise.code}): ${raise.stderr}`);
				await key.showAlert();
				return;
			}
			const tmux = findTmuxPath();
			const selected = await runTmux(
				["select-window", "-t", `${pane.session}:${pane.windowIndex}`],
				tmux,
			);
			if (!selected.ok) {
				streamDeck.logger.error(`Claude Project select-window failed: ${selected.stderr}`);
				await key.showAlert();
				return;
			}
			await key.showOk();
			setTimeout(() => void this.refreshAll(), 450); // frontmost settle
			return;
		}

		// Plain terminal: try the running hosts by tty. Only address apps that
		// are RUNNING — AppleScript launches the ones that aren't.
		if (await processRunning("iTerm2")) {
			const raise = await runAppleScript(buildITermRaiseScript(target.tty));
			if (raise.ok && raise.stdout.includes("ok")) {
				await key.showOk();
				return;
			}
		}
		if (await processRunning(TERMINAL_PROCESS_NAME)) {
			const raise = await runAppleScript(buildTerminalRaiseScript(target.tty));
			if (raise.ok && raise.stdout.includes("ok")) {
				await key.showOk();
				return;
			}
		}
		streamDeck.logger.warn(`Claude Project: no window found hosting ${target.tty}.`);
		await key.showAlert();
	}

	/** Long press: capture the frontmost session's project into this button. */
	private async capture(key: KeyAction<ClaudeProjectSettings>): Promise<void> {
		const snap = await this.snapshot();
		if (snap.focusedTty === "") {
			streamDeck.logger.warn("Claude Project capture: no terminal is frontmost.");
			await key.showAlert();
			return;
		}

		// Direct hit: the focused tab/session IS a claude tty (plain host).
		let cwd = snap.instances.find((i) => i.tty === snap.focusedTty)?.cwd;

		// tmux: the focused tty is a CLIENT tty; find the session it shows, then
		// the pane that would receive keys, then the claude on that pane tty.
		if (cwd === undefined) {
			for (const [session, clientTty] of snap.clients) {
				if (clientTty !== snap.focusedTty) continue;
				const pane = snap.panes.find((p) => p.session === session && p.receivesKeys);
				if (pane !== undefined) {
					cwd = snap.instances.find((i) => i.tty === pane.tty)?.cwd;
				}
				break;
			}
		}

		if (cwd === undefined || cwd === "") {
			streamDeck.logger.warn("Claude Project capture: focused terminal is not running claude.");
			await key.showAlert();
			return;
		}
		const settings = await key.getSettings();
		await key.setSettings({ ...settings, project: cwd });
		streamDeck.logger.info(`Claude Project captured ${cwd}.`);
		await key.showOk();
		await this.refreshAll();
	}
}
