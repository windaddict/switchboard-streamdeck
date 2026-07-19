import { describe, expect, it } from "vitest";
import {
	buildClaudeProjectKeyImage,
	instancesForProject,
	normalizeProjectPath,
	busyParentsFrom,
	childrenOf,
	claudesFrom,
	parseLsofCwds,
	parsePsProcs,
	projectBasename,
	projectClaudeState,
	projectSlug,
	TRANSCRIPT_FRESH_MS,
} from "../src/mac/claude-project.js";

describe("cheap ps scan (parsePsProcs / claudesFrom / childrenOf)", () => {
	const PS = [
		" 1120 1000 ttys019 claude",
		"14251 1000 ttys001 claude",
		"  400 1000 ??      claude",
		"  500 1000 ttys002 Claude",
		"  600 1000 ttys003 claude-something",
		"  700 1000 ttys004 /usr/local/bin/claude",
		" 3161 1120 ??      zsh",
		" 3200 9999 ??      zsh",
	].join("\n");
	const procs = parsePsProcs(PS);
	it("keeps claude processes with a real tty, /dev-prefixed", () => {
		expect(claudesFrom(procs)).toEqual([
			{ pid: 1120, tty: "/dev/ttys019" },
			{ pid: 14251, tty: "/dev/ttys001" },
			{ pid: 700, tty: "/dev/ttys004" },
		]);
	});
	it("drops ttyless (??) processes and non-claude comms", () => {
		const pids = claudesFrom(procs).map((p) => p.pid);
		expect(pids).not.toContain(400);
		expect(pids).not.toContain(500); // desktop app binary (capital C)
		expect(pids).not.toContain(600);
	});
	it("collects direct children of claude pids for the confirm pass", () => {
		expect(childrenOf(procs, new Set([1120, 14251, 700]))).toEqual([3161]);
	});
	it("tolerates empty output", () => {
		expect(parsePsProcs("")).toEqual([]);
	});
});

describe("busyParentsFrom (targeted argv confirm)", () => {
	it("marks parents whose child argv carries the shell-snapshot marker", () => {
		const OUT = [
			"3161 1120 /bin/zsh -c source /Users/j/.claude/shell-snapshots/snapshot-zsh-17.sh && eval 'sleep 100'",
			"3300 1120 node /some/mcp-server.js",
			"3400 14251 /bin/zsh -c plain-shell-no-marker",
		].join("\n");
		const busy = busyParentsFrom(OUT);
		expect(busy.has(1120)).toBe(true);
		expect(busy.has(14251)).toBe(false); // shell child without the marker
	});
	it("empty confirm output marks nothing", () => {
		expect(busyParentsFrom("").size).toBe(0);
	});
});

describe("parseLsofCwds", () => {
	it("parses batched -Fpn output into pid -> cwd", () => {
		const OUT = "p1120\nfcwd\nn/Users/j/code/descant\np14251\nfcwd\nn/Users/j/code/site\n";
		const m = parseLsofCwds(OUT);
		expect(m.get(1120)).toBe("/Users/j/code/descant");
		expect(m.get(14251)).toBe("/Users/j/code/site");
	});
	it("tolerates empty/garbage output", () => {
		expect(parseLsofCwds("").size).toBe(0);
		expect(parseLsofCwds("nOrphanPath\n").size).toBe(0); // n before any p
	});
});

describe("projectSlug", () => {
	it("replaces every non-alphanumeric with a dash (verified transform)", () => {
		expect(projectSlug("/Users/johnknox/code/switchboard")).toBe("-Users-johnknox-code-switchboard");
		expect(projectSlug("/Users/j/.claude-worktrees/x")).toBe("-Users-j--claude-worktrees-x");
	});
});

describe("instancesForProject", () => {
	const instances = [
		{ pid: 1, tty: "/dev/ttys001", cwd: "/Users/j/code/app", shellBusy: false },
		{ pid: 2, tty: "/dev/ttys002", cwd: "/Users/j/code/other", shellBusy: false },
	];
	it("matches by normalized path (trailing slash tolerated)", () => {
		expect(instancesForProject(instances, "/Users/j/code/app/")).toHaveLength(1);
		expect(instancesForProject(instances, "/Users/j/code/app")[0].pid).toBe(1);
	});
	it("no match for a different project", () => {
		expect(instancesForProject(instances, "/Users/j/code/nope")).toHaveLength(0);
	});
	it("normalizeProjectPath keeps root intact", () => {
		expect(normalizeProjectPath("/")).toBe("/");
	});
});

describe("projectClaudeState", () => {
	it("none when no process", () => {
		expect(projectClaudeState({ present: false, titleWorking: null, transcriptAgeMs: 1 })).toBe("none");
	});
	it("title marker wins in both directions (survives long tool calls)", () => {
		expect(
			projectClaudeState({ present: true, titleWorking: true, transcriptAgeMs: 999_999 }),
		).toBe("working");
		expect(projectClaudeState({ present: true, titleWorking: false, transcriptAgeMs: 0 })).toBe(
			"waiting",
		);
	});
	it("a running background shell OUTRANKS the idle title ('Brewed … · 1 shell still running')", () => {
		expect(
			projectClaudeState({ present: true, titleWorking: false, transcriptAgeMs: 300_000, shellBusy: true }),
		).toBe("working");
	});
	it("BREWING outranks the ✳ idle title — transcript owes a turn, stale mtime (the reported bug)", () => {
		expect(
			projectClaudeState({ present: true, titleWorking: false, transcriptAgeMs: 300_000, transcriptWorking: true }),
		).toBe("working");
	});
	it("genuinely idle: ✳ title, transcript not owing, stale = waiting", () => {
		expect(
			projectClaudeState({ present: true, titleWorking: false, transcriptAgeMs: 300_000, transcriptWorking: false }),
		).toBe("waiting");
	});
	it("✳ title beats a merely-fresh mtime — no false 'working' for 30s after a turn finishes", () => {
		expect(
			projectClaudeState({ present: true, titleWorking: false, transcriptAgeMs: 0, transcriptWorking: false }),
		).toBe("waiting");
	});
	it("no title (non-tmux host): a fresh transcript means streaming = working", () => {
		expect(
			projectClaudeState({ present: true, titleWorking: null, transcriptAgeMs: 5_000, transcriptWorking: false }),
		).toBe("working");
	});
	it("falls back to transcript freshness when no title is readable", () => {
		expect(
			projectClaudeState({ present: true, titleWorking: null, transcriptAgeMs: TRANSCRIPT_FRESH_MS - 1 }),
		).toBe("working");
		expect(
			projectClaudeState({ present: true, titleWorking: null, transcriptAgeMs: TRANSCRIPT_FRESH_MS + 1 }),
		).toBe("waiting");
		expect(projectClaudeState({ present: true, titleWorking: null, transcriptAgeMs: null })).toBe(
			"waiting",
		);
	});
});

describe("projectBasename", () => {
	it("last path segment", () => {
		expect(projectBasename("/Users/j/code/switchboard")).toBe("switchboard");
		expect(projectBasename("/Users/j/code/switchboard/")).toBe("switchboard");
		expect(projectBasename("")).toBe("?");
	});
});

describe("buildClaudeProjectKeyImage", () => {
	const base = { project: "/Users/j/code/app", host: "tmux" as const, hot: false, claude: "waiting" as const };
	it("no claude: dashed bar, no spark", () => {
		const svg = buildClaudeProjectKeyImage({ ...base, claude: "none", host: "" });
		expect(svg).toContain("stroke-dasharray");
		expect(svg).not.toContain("M56 12h10");
	});
	it("hot lights the bar with the cursor block", () => {
		const svg = buildClaudeProjectKeyImage({ ...base, hot: true });
		expect(svg).toContain('fill="url(#b)"');
		expect(svg).toContain('fill="#F2FFF6"');
	});
	it("working spark is amber and rotates with the tick; waiting is white and still", () => {
		expect(buildClaudeProjectKeyImage({ ...base, claude: "working", spin: 2 })).toContain(
			'stroke="#F0A63C"',
		);
		expect(buildClaudeProjectKeyImage({ ...base, claude: "working", spin: 2 })).toContain(
			'transform="rotate(60 61 12)"',
		);
		expect(buildClaudeProjectKeyImage({ ...base, claude: "waiting" })).toContain('stroke="#F2FFF6"');
	});
	it("working orbit dot moves between ticks; waiting has none", () => {
		const a = buildClaudeProjectKeyImage({ ...base, claude: "working", spin: 0 });
		const b = buildClaudeProjectKeyImage({ ...base, claude: "working", spin: 1 });
		expect(a).toContain('cx="61" cy="4"');
		expect(b).toContain('cx="65" cy="5.1"');
		expect(buildClaudeProjectKeyImage({ ...base, claude: "waiting" })).not.toContain('r="1.7"');
	});
	it("shows the project basename and host eyebrow, XML-escaped, hex only", () => {
		const svg = buildClaudeProjectKeyImage({ ...base, project: "/x/a&b" });
		expect(svg).toContain("a&amp;b");
		expect(svg).toContain(">TMUX</text>");
		expect(svg).not.toContain("hsl(");
	});
});
