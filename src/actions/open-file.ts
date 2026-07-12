import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import {
	buildOpenArgs,
	expandHome,
	type FileEntry,
	type Opener,
	type PickMode,
	selectFile,
} from "../mac/files.js";
import { buildOpenFileImage, type FileStatus, svgToDataUri } from "../mac/key-image.js";

type OpenFileSettings = {
	directory?: string;
	pattern?: string;
	pick?: PickMode;
	openWith?: Opener;
	app?: string;
	statusIndicator?: boolean;
};

/** How often the status badge re-checks the directory (ms). */
const POLL_MS = 10_000;

/**
 * Open the newest / latest-modified / pattern-matched file in a directory with
 * the default app, BBEdit, or a chosen app. When the status indicator is on,
 * the key shows a ✓ when a matching file exists or a ✗ when none does, polled
 * live so it reflects new files without a press.
 */
@action({ UUID: "com.movingavg.switchboard.openfile" })
export class OpenFile extends SingletonAction<OpenFileSettings> {
	private readonly visible = new Map<string, KeyAction<OpenFileSettings>>();
	private timer?: ReturnType<typeof setInterval>;

	override async onWillAppear(ev: WillAppearEvent<OpenFileSettings>): Promise<void> {
		if (!ev.action.isKey()) return;
		this.visible.set(ev.action.id, ev.action);
		if (this.timer === undefined) {
			this.timer = setInterval(() => void this.refreshAll(), POLL_MS);
		}
		await this.updateStatus(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<OpenFileSettings>): void {
		this.visible.delete(ev.action.id);
		if (this.visible.size === 0 && this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<OpenFileSettings>): Promise<void> {
		if (ev.action.isKey()) {
			await this.updateStatus(ev.action, ev.payload.settings);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<OpenFileSettings>): Promise<void> {
		const settings = ev.payload.settings;
		const dir = expandHome((settings.directory ?? "").trim(), homedir());
		if (!dir) {
			streamDeck.logger.warn("Open File pressed with no directory configured.");
			await ev.action.showAlert();
			return;
		}

		const entries = await this.list(dir);
		if (entries === null) {
			streamDeck.logger.error(`Open File: cannot read directory "${dir}".`);
			await ev.action.showAlert();
			return;
		}

		const chosen = selectFile(entries, settings.pattern ?? "*", settings.pick ?? "modified");
		if (!chosen) {
			streamDeck.logger.warn(`Open File: no file matched "${settings.pattern ?? "*"}" in ${dir}.`);
			await ev.action.showAlert();
			await this.updateStatus(ev.action, settings);
			return;
		}

		const args = buildOpenArgs(join(dir, chosen.name), settings.openWith ?? "default", settings.app);
		const ok = await this.open(args);
		await (ok ? ev.action.showOk() : ev.action.showAlert());
		await this.updateStatus(ev.action, settings);
	}

	/**
	 * Read a directory into file entries with timestamps, or null on error.
	 * Fully async: this plugin is ONE process serving every key and dial, and a
	 * slow/network/huge directory scanned synchronously would freeze all of
	 * them (it polls every 10s). Stat failures on individual files (deleted
	 * mid-scan) are skipped rather than failing the listing.
	 */
	private async list(dir: string): Promise<FileEntry[] | null> {
		try {
			const dirents = await readdir(dir, { withFileTypes: true });
			const names = dirents.filter((d) => d.isFile()).map((d) => d.name);
			const entries: FileEntry[] = [];
			// Bounded batches: a huge directory must not open thousands of
			// simultaneous stat operations (descriptor pressure).
			const BATCH = 64;
			for (let i = 0; i < names.length; i += BATCH) {
				const batch = await Promise.all(
					names.slice(i, i + BATCH).map(async (name) => {
						try {
							const st = await stat(join(dir, name));
							return { name, mtimeMs: st.mtimeMs, birthtimeMs: st.birthtimeMs };
						} catch {
							return null; // deleted mid-scan
						}
					}),
				);
				for (const e of batch) if (e !== null) entries.push(e);
			}
			return entries;
		} catch {
			return null;
		}
	}

	private open(args: string[]): Promise<boolean> {
		return new Promise((resolve) => {
			execFile("/usr/bin/open", args, { timeout: 10_000 }, (err) => resolve(!err));
		});
	}

	private async refreshAll(): Promise<void> {
		for (const action of this.visible.values()) {
			const settings = await action.getSettings();
			await this.updateStatus(action, settings);
		}
	}

	/** Paint the ✓/✗ status badge (or reset to the plain icon when disabled). */
	private async updateStatus(
		action: KeyAction<OpenFileSettings>,
		settings: OpenFileSettings,
	): Promise<void> {
		try {
			if (!settings.statusIndicator) {
				await action.setImage();
				return;
			}
			const dir = expandHome((settings.directory ?? "").trim(), homedir());
			let status: FileStatus = "none";
			if (dir) {
				const entries = await this.list(dir);
				const hit = entries && selectFile(entries, settings.pattern ?? "*", settings.pick ?? "modified");
				status = hit ? "match" : "none";
			}
			await action.setImage(svgToDataUri(buildOpenFileImage(status)));
		} catch (err) {
			streamDeck.logger.debug(`Open File status update skipped: ${String(err)}`);
		}
	}
}
