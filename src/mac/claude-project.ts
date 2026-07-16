/**
 * Pure logic for the "Claude Project" key: find Claude Code CLI instances on
 * the machine (any host — tmux, plain iTerm2, Terminal.app), decide their
 * working/waiting state, and render the live key face. The impure scanning
 * lives in claude-scan.ts; this module only parses and decides.
 *
 * Identity model: a button targets a PROJECT DIRECTORY. A claude process
 * belongs to it when its cwd matches. State comes from two signals:
 * the tmux pane title's spinner marker when the instance is tmux-hosted
 * (always readable via the tmux server), else the freshness of the newest
 * transcript .jsonl under ~/.claude/projects/<slug>/ — verified to advance
 * only while a session is actively working.
 */

import type { ClaudeState } from "./claude-state.js";
import { hslToHex } from "./svg.js";
import { escapeXml, sessionHue } from "./tmux-window.js";

/** A running Claude Code CLI process. */
export interface ClaudeInstance {
	pid: number;
	/** Controlling tty device path, e.g. "/dev/ttys007" ("" when none). */
	tty: string;
	/** The process's working directory = its project. */
	cwd: string;
}

/**
 * Parse `ps -axo pid=,tty=,comm=` output, keeping only `claude` processes
 * with a real controlling tty. NOTE: enumerate with ps, not pgrep — BSD pgrep
 * silently omits its own ancestor processes.
 */
export function parsePsClaude(output: string): Array<{ pid: number; tty: string }> {
	const out: Array<{ pid: number; tty: string }> = [];
	for (const rawLine of output.split("\n")) {
		const line = rawLine.trim();
		if (line === "") continue;
		const fields = line.split(/\s+/);
		if (fields.length < 3) continue;
		const pid = Number.parseInt(fields[0], 10);
		const tty = fields[1];
		const comm = fields.slice(2).join(" ");
		const base = comm.slice(comm.lastIndexOf("/") + 1);
		if (!Number.isFinite(pid) || base !== "claude" || tty === "??") continue;
		out.push({ pid, tty: `/dev/${tty}` });
	}
	return out;
}

/** Parse batched `lsof -a -p <csv> -d cwd -Fpn` output into pid → cwd. */
export function parseLsofCwds(output: string): Map<number, string> {
	const cwds = new Map<number, string>();
	let pid: number | null = null;
	for (const line of output.split("\n")) {
		if (line.startsWith("p")) {
			const n = Number.parseInt(line.slice(1), 10);
			pid = Number.isFinite(n) ? n : null;
		} else if (line.startsWith("n") && pid !== null) {
			cwds.set(pid, line.slice(1));
		}
	}
	return cwds;
}

/** ~/.claude/projects directory name for a project path: every
 * non-alphanumeric character becomes "-" (verified transform). */
export function projectSlug(projectPath: string): string {
	return projectPath.replace(/[^A-Za-z0-9]/g, "-");
}

/** Normalize a configured project path for matching (trailing slash off). */
export function normalizeProjectPath(p: string): string {
	const trimmed = p.trim();
	return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

/** The instances whose cwd is exactly the target project. */
export function instancesForProject(
	instances: ClaudeInstance[],
	projectPath: string,
): ClaudeInstance[] {
	const target = normalizeProjectPath(projectPath);
	return instances.filter((i) => normalizeProjectPath(i.cwd) === target);
}

/** A transcript younger than this is "actively working". */
export const TRANSCRIPT_FRESH_MS = 30_000;

/**
 * Decide the project's Claude state. Title marker wins when known (the tmux
 * pane title's spinner stays animated through long tool calls, where the
 * transcript goes quiet); transcript freshness covers hosts whose titles we
 * can't read without launching apps.
 */
export function projectClaudeState(args: {
	present: boolean;
	/** true/false when a tmux pane title was readable; null when unknown. */
	titleWorking: boolean | null;
	/** Age of the newest transcript .jsonl in ms; null when none found. */
	transcriptAgeMs: number | null;
}): ClaudeState {
	if (!args.present) return "none";
	if (args.titleWorking === true) return "working";
	if (args.titleWorking === false) return "waiting";
	if (args.transcriptAgeMs !== null && args.transcriptAgeMs < TRANSCRIPT_FRESH_MS) {
		return "working";
	}
	return "waiting";
}

/** Where the button's project is currently hosted (drives the eyebrow). */
export type ClaudeHost = "tmux" | "iterm" | "terminal" | "";

const MONO = "Menlo, Monaco, monospace";

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Last path segment as the display name ("" -> "?"). */
export function projectBasename(projectPath: string): string {
	const normalized = normalizeProjectPath(projectPath);
	const base = normalized.slice(normalized.lastIndexOf("/") + 1);
	return base || "?";
}

/** 12 o'clock-start orbit positions for the working dot (r=8 around the spark). */
const ORBIT: ReadonlyArray<readonly [number, number]> = [[61.0, 4.0], [65.0, 5.1], [67.9, 8.0], [69.0, 12.0], [67.9, 16.0], [65.0, 18.9], [61.0, 20.0], [57.0, 18.9], [54.1, 16.0], [53.0, 12.0], [54.1, 8.0], [57.0, 5.1]];

/**
 * Render the 72×72 live key face, sibling of the tmux key: ink ground, the
 * project name in mono (hue seeded per project, so each project wears a
 * stable colour), host as the eyebrow, the status bar lit when keystrokes
 * would land in that session, and the Claude spark (amber turning = working,
 * white still = waiting). No claude process → dashed bar, no spark. Hex
 * colours only — the key rasterizer paints hsl() black.
 */
export function buildClaudeProjectKeyImage(args: {
	project: string;
	host: ClaudeHost;
	hot: boolean;
	claude: ClaudeState;
	spin?: number;
}): string {
	const name = truncate(projectBasename(args.project), 9);
	const hue = sessionHue(projectBasename(args.project));
	const spin = args.spin ?? 0;

	let bar: string;
	let nameFill: string;
	let eyebrowFill = "";

	if (args.claude === "none") {
		bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>`;
		nameFill = "#6A716E";
	} else if (args.hot) {
		bar =
			`<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">` +
			`<stop offset="0" stop-color="${hslToHex(hue, 62, 46)}"/>` +
			`<stop offset="1" stop-color="${hslToHex(hue, 66, 36)}"/>` +
			`</linearGradient></defs>` +
			`<rect x="0" y="57" width="72" height="15" fill="url(#b)"/>` +
			`<rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`;
		nameFill = "#FFFFFF";
		eyebrowFill = hslToHex(hue, 55, 72);
	} else {
		bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
		nameFill = "#A6ADA9";
		eyebrowFill = hslToHex(hue, 50, 70);
	}

	// Anchored at x=30, not center: the longest host label ("TERMINAL") must
	// clear the Claude spark in the top-right corner.
	const eyebrow = args.host
		? `<text x="30" y="15" text-anchor="middle" font-family="${MONO}" font-size="7.5" letter-spacing="1" fill="${eyebrowFill || "#8B9490"}">${escapeXml(truncate(args.host.toUpperCase(), 8))}</text>`
		: "";

	let spark = "";
	if (args.claude !== "none") {
		const color = args.claude === "working" ? "#F0A63C" : "#F2FFF6";
		const angle = args.claude === "working" ? (spin % 12) * 30 : 0;
		spark =
			`<path d="M56 12h10M58.5 7.7l5 8.6M63.5 7.7l-5 8.6" ` +
			`stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none" ` +
			`transform="rotate(${angle} 61 12)"/>`;
		if (args.claude === "working") {
			// The star is 6-fold symmetric, so its rotation collapses to a
			// two-frame wobble — motion you cannot see at key size. The orbiting
			// dot gives 12 genuinely distinct frames per revolution.
			const [ox, oy] = ORBIT[spin % 12];
			spark += `<circle cx="${ox}" cy="${oy}" r="1.7" fill="#F0A63C"/>`;
		}
	}

	// tmux identity mark's sibling: a small spark outline at the bar's left
	// end marks this as a Claude key even when idle.
	const mark =
		`<path d="M6.5 64.25h7M8 61.25l4 6M12 61.25l-4 6" ` +
		`stroke="${args.claude === "none" ? "#8B9490" : args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70)}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
		`<rect width="72" height="72" fill="#0F1211"/>` +
		eyebrow +
		spark +
		`<text x="36" y="40" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>` +
		bar +
		mark +
		`</svg>`
	);
}
