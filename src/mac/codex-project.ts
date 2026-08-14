/** Pure identity, rollout-state, tmux-target, and key-face logic for Codex Project. */

import { hslToHex } from "./svg.js";
import { escapeXml, sessionHue } from "./tmux-window.js";

export type CodexState = "none" | "working" | "blocked" | "waiting" | "unknown";
export type CodexHost = "tmux" | "iterm" | "terminal" | "";

export interface CodexInstance {
	pid: number;
	tty: string;
	cwd: string;
	rolloutPath: string;
	sessionId: string;
	state: Exclude<CodexState, "none">;
}

export interface CodexProcess {
	pid: number;
	tty: string;
	comm: string;
	args: string;
}

/** Parse targeted `ps -o pid=,tty=,comm=,args=` output. */
export function parseCodexProcesses(output: string): CodexProcess[] {
	const result: CodexProcess[] = [];
	for (const raw of output.split("\n")) {
		const m = raw.trim().match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
		if (m === null) continue;
		const pid = Number.parseInt(m[1], 10);
		if (!Number.isFinite(pid)) continue;
		result.push({ pid, tty: m[2], comm: m[3], args: m[4] });
	}
	return result;
}

function basename(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1);
}

/** Cheap candidate gate. The rollout's `originator` is the authoritative
 * interactive-vs-exec discriminator: rendered ps argv cannot distinguish the
 * subcommand `review` from an initial prompt beginning with the word review. */
export function isInteractiveCodex(p: CodexProcess): boolean {
	if (p.tty === "??" || basename(p.comm) !== "codex") return false;
	const words = p.args.trim().split(/\s+/);
	return words.length > 0 && basename(words[0]) === "codex";
}

export interface LsofEntry {
	pid: number;
	fd: string;
	name: string;
}

/** Parse lsof field output (`-Fpcfn`) without ever retaining file contents. */
export function parseLsofEntries(output: string): LsofEntry[] {
	const entries: LsofEntry[] = [];
	let pid: number | null = null;
	let fd = "";
	for (const line of output.split("\n")) {
		if (line.startsWith("p")) {
			const n = Number.parseInt(line.slice(1), 10);
			pid = Number.isFinite(n) ? n : null;
			fd = "";
		} else if (line.startsWith("f")) {
			fd = line.slice(1);
		} else if (line.startsWith("n") && pid !== null) {
			entries.push({ pid, fd, name: line.slice(1) });
		}
	}
	return entries;
}

export function isRolloutPath(path: string): boolean {
	return /\/sessions\/\d{4}\/\d{2}\/\d{2}\/rollout-[^/]+\.jsonl$/.test(path);
}

/** Session UUID is the final UUID-like component before `.jsonl`. */
export function rolloutSessionId(path: string): string {
	return path.match(/([0-9a-f]{8}-[0-9a-f-]{27})\.jsonl$/i)?.[1] ?? "";
}

const BLOCKED_EVENTS = new Set([
	"approval_request", "approval_requested", "request_user_input", "user_input_requested",
	"elicitation_request",
]);
const UNKNOWN_TERMINALS = new Set([
	"task_error", "task_failed", "task_aborted", "task_interrupted", "stream_error",
]);

/** Last relevant complete rollout record decides state. Unknown is deliberate. */
export function codexStateFromRolloutLines(
	lines: readonly string[],
): Exclude<CodexState, "none"> {
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (!line.includes('"type"')) continue;
		try {
			const row = JSON.parse(line) as { type?: string; payload?: { type?: string } };
			if (row.type !== "event_msg") continue;
			const event = row.payload?.type ?? "";
			if (event === "task_complete") return "waiting";
			if (BLOCKED_EVENTS.has(event)) return "blocked";
			if (UNKNOWN_TERMINALS.has(event)) return "unknown";
			if (event === "task_started") return "working";
		} catch {
			// A concurrent append or bounded partial record is not state evidence.
		}
	}
	return "unknown";
}

/** Session metadata is at the head of every observed rollout. */
export function codexRolloutOriginator(lines: readonly string[]): string {
	for (const line of lines) {
		try {
			const row = JSON.parse(line) as { type?: string; payload?: { originator?: string } };
			if (row.type === "session_meta") return row.payload?.originator ?? "";
		} catch { /* partial record */ }
	}
	return "";
}

export function normalizeProjectPath(path: string): string {
	const trimmed = path.trim();
	return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

export function codexInstancesForProject(
	instances: readonly CodexInstance[],
	project: string,
): CodexInstance[] {
	const target = normalizeProjectPath(project);
	return instances.filter((i) => normalizeProjectPath(i.cwd) === target);
}

/** Prefer the captured identity. Never guess when several sessions share a cwd. */
export function selectCodexInstance(
	instances: readonly CodexInstance[],
	project: string,
	sessionId: string,
): CodexInstance | null {
	const mine = codexInstancesForProject(instances, project);
	const captured = mine.find((i) => sessionId !== "" && i.sessionId === sessionId);
	if (captured !== undefined) return captured;
	return mine.length === 1 ? mine[0] : null;
}

export interface CodexPane {
	tty: string;
	session: string;
	windowId: string;
	paneId: string;
	receivesKeys: boolean;
}

export const LIST_CODEX_PANES_ARGS = [
	"list-panes", "-a", "-F",
	"#{pane_tty}|#{session_name}|#{window_id}|#{pane_id}|#{pane_active}|#{window_active}",
];

export function parseCodexPanes(output: string): CodexPane[] {
	const result: CodexPane[] = [];
	for (const raw of output.split("\n")) {
		const f = raw.trim().split("|");
		if (f.length < 6) continue;
		const tail = f.length - 4;
		const windowId = f[tail];
		const paneId = f[tail + 1];
		if (!windowId.startsWith("@") || !paneId.startsWith("%")) continue;
		result.push({
			tty: f[0],
			session: f.slice(1, tail).join("|"),
			windowId,
			paneId,
			receivesKeys: f[tail + 2] === "1" && f[tail + 3] === "1",
		});
	}
	return result;
}

export function codexTmuxFocusArgs(pane: CodexPane, clientTty: string): string[][] {
	const commands: string[][] = [];
	if (clientTty !== "") commands.push(["switch-client", "-c", clientTty, "-t", pane.session]);
	commands.push(["select-window", "-t", pane.windowId]);
	commands.push(["select-pane", "-t", pane.paneId]);
	return commands;
}

function projectBasename(path: string): string {
	const p = normalizeProjectPath(path);
	return p.slice(p.lastIndexOf("/") + 1) || "?";
}

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const MONO = "Menlo, Monaco, monospace";
const ORBIT: ReadonlyArray<readonly [number, number]> = [[61, 4], [65, 5.1], [67.9, 8], [69, 12], [67.9, 16], [65, 18.9], [61, 20], [57, 18.9], [54.1, 16], [53, 12], [54.1, 8], [57, 5.1]];

/** Codex sibling of the Claude live face. Hex colors only for key rasterizing. */
export function buildCodexProjectKeyImage(args: {
	project: string;
	host: CodexHost;
	hot: boolean;
	state: CodexState;
	spin?: number;
}): string {
	const name = truncate(projectBasename(args.project), 9);
	const hue = sessionHue(projectBasename(args.project));
	const active = args.state !== "none";
	const color = args.state === "working" ? "#4E9CFF" : args.state === "blocked" ? "#F0A63C" : args.state === "waiting" ? "#F2FFF6" : "#8B9490";
	const nameFill = active ? args.hot ? "#FFFFFF" : "#A6ADA9" : "#6A716E";
	const bar = !active
		? '<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>'
		: args.hot
			? `<rect x="0" y="57" width="72" height="15" fill="${hslToHex(hue, 62, 42)}"/><rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`
			: `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
	const eyebrow = args.host ? `<text x="30" y="15" text-anchor="middle" font-family="${MONO}" font-size="7.5" letter-spacing="1" fill="${hslToHex(hue, 50, 70)}">${escapeXml(args.host.toUpperCase())}</text>` : "";
	let glyph = "";
	if (active) {
		const spin = args.spin ?? 0;
		glyph = `<path d="M56 7h10v10H56zM59 10h4v4h-4z" fill="none" stroke="${color}" stroke-width="1.8"/>`;
		if (args.state === "working") {
			const [x, y] = ORBIT[spin % ORBIT.length];
			glyph += `<circle cx="${x}" cy="${y}" r="1.7" fill="#4E9CFF"/>`;
		}
	}
	const mark = `<path d="M7 61h7v7H7zM9 63h3v3H9z" fill="none" stroke="${active ? args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70) : "#8B9490"}" stroke-width="1.2"/>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#0F1211"/>${eyebrow}${glyph}<text x="36" y="40" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>${bar}${mark}</svg>`;
}
