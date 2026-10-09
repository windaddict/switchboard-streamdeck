import { describe, it, expect } from "vitest";
import {
	parseWindows,
	parseClients,
	parseClientTtys,
	chooseClientTty,
	sessionForTty,
	resolveTarget,
	selectWindowArgs,
	switchClientToWindowArgs,
	tmuxWindowLabel,
	tmuxWindowOptions,
	exactTargetFor,
	type TmuxWindow,
} from "../src/mac/tmux.js";

const WINDOWS_FIXTURE =
	"apps|1|0|@1|100|copybug\napps|2|1|@2|100|metronome\napps|3|0|@3|100|passages\ndev|1|1|@4|100|ea-system\ndev|2|0|@5|100|movingavg\ndev|3|0|@6|100|medtech\n";

const CLIENTS_FIXTURE = "/dev/ttys000|dev\n/dev/ttys007|apps\n";

describe("parseWindows", () => {
	it("returns 6 windows from the fixture", () => {
		expect(parseWindows(WINDOWS_FIXTURE)).toHaveLength(6);
	});

	it("spot-checks a window fully", () => {
		const windows = parseWindows(WINDOWS_FIXTURE);
		expect(windows[1]).toEqual({
			session: "apps",
			index: 2,
			name: "metronome",
			active: true,
			id: "@2",
			serverPid: "100",
		});
	});

	it("marks active false when the field is '0'", () => {
		const windows = parseWindows(WINDOWS_FIXTURE);
		const copybug = windows.find((w) => w.name === "copybug");
		expect(copybug?.active).toBe(false);
	});

	it("parses index as a number, not a string", () => {
		const windows = parseWindows(WINDOWS_FIXTURE);
		expect(typeof windows[0].index).toBe("number");
		expect(windows[0].index).toBe(1);
	});

	it("keeps a pipe in the window name (name is the LAST field, joined)", () => {
		const windows = parseWindows("dev|4|1|@9|100|api|logs\n");
		expect(windows).toEqual([{ session: "dev", index: 4, name: "api|logs", active: true, id: "@9", serverPid: "100" }]);
	});
	it("skips blank and short (<6 field) lines", () => {
		// "dev|5|0|old" is the pre-id four-field format: it must be skipped, not
		// read with the name in the id slot.
		const input =
			"apps|1|0|@1|100|copybug\n\n   \nbad|line\ndev|5|0|old\ndev|5|0|@7|old\ndev|2|0|@5|100|movingavg\n";
		const windows = parseWindows(input);
		expect(windows).toHaveLength(2);
		expect(windows.map((w) => w.name)).toEqual(["copybug", "movingavg"]);
	});
});

describe("parseClients", () => {
	it("maps each session to its tty", () => {
		const clients = parseClients(CLIENTS_FIXTURE);
		expect(clients.get("dev")).toBe("/dev/ttys000");
		expect(clients.get("apps")).toBe("/dev/ttys007");
		expect(clients.size).toBe(2);
	});

	it("first occurrence wins when a session is duplicated", () => {
		const input =
			"/dev/ttys000|dev\n/dev/ttys009|dev\n/dev/ttys007|apps\n";
		const clients = parseClients(input);
		expect(clients.get("dev")).toBe("/dev/ttys000");
		expect(clients.size).toBe(2);
	});

	it("skips blank and malformed lines", () => {
		const input = "/dev/ttys000|dev\n\nnotvalid\n/dev/ttys007|apps\n";
		const clients = parseClients(input);
		expect(clients.size).toBe(2);
	});
});

describe("parseClientTtys", () => {
	it("preserves every distinct client for a session", () => {
		const clients = parseClientTtys("/dev/ttys000|dev\n/dev/ttys009|dev\n/dev/ttys000|dev\n/dev/ttys007|apps\n");
		expect(clients.get("dev")).toEqual(["/dev/ttys000", "/dev/ttys009"]);
		expect(clients.get("apps")).toEqual(["/dev/ttys007"]);
	});
	it("skips malformed or empty identities", () => {
		expect(parseClientTtys("bad\n|dev\n/dev/ttys001|\n").size).toBe(0);
	});
});

describe("tmux client targeting", () => {
	it("prefers an already focused client and otherwise keeps list order", () => {
		const ttys = ["/dev/ttys001", "/dev/ttys009"];
		expect(chooseClientTty(ttys, "/dev/ttys009")).toBe("/dev/ttys009");
		expect(chooseClientTty(ttys, "/dev/ttys777")).toBe("/dev/ttys001");
		expect(chooseClientTty([], "")).toBeNull();
	});
	it("targets a window by tmux id when given one (survives renumbering mid-press)", () => {
		expect(switchClientToWindowArgs("dev", "@8", "/dev/ttys009")).toEqual([
			"switch-client", "-c", "/dev/ttys009", "-t", "dev:@8",
		]);
	});
	it("targets one client and exact window", () => {
		expect(switchClientToWindowArgs("dev", 2, "/dev/ttys009")).toEqual([
			"switch-client", "-c", "/dev/ttys009", "-t", "dev:2",
		]);
	});
});

describe("resolveTarget — bare names", () => {
	const windows = parseWindows(WINDOWS_FIXTURE);

	it("exact name match", () => {
		expect(resolveTarget(windows, "movingavg")).toEqual({
			session: "dev",
			index: 2,
			name: "movingavg",
			active: false,
			id: "@5",
			serverPid: "100",
		});
	});

	it("substring match", () => {
		expect(resolveTarget(windows, "metro")?.name).toBe("metronome");
	});

	it("is case-insensitive", () => {
		expect(resolveTarget(windows, "MOVINGAVG")?.name).toBe("movingavg");
	});

	it("returns null when nothing matches", () => {
		expect(resolveTarget(windows, "nope")).toBeNull();
	});

	it("prefers an exact match over a substring match", () => {
		const subset: TmuxWindow[] = [
			{ session: "dev", index: 1, name: "ea-system", active: false, id: "@1", serverPid: "100" },
			{ session: "dev", index: 2, name: "ea", active: false, id: "@2", serverPid: "100" },
		];
		// "ea" is a substring of "ea-system", but the exact "ea" must win
		// regardless of fixture order.
		expect(resolveTarget(subset, "ea")?.name).toBe("ea");
	});
});

describe("resolveTarget — session:name and session:index", () => {
	const windows = parseWindows(WINDOWS_FIXTURE);

	it("session:name resolves the right window", () => {
		expect(resolveTarget(windows, "dev:movingavg")).toEqual({
			session: "dev",
			index: 2,
			name: "movingavg",
			active: false,
			id: "@5",
			serverPid: "100",
		});
	});

	it("session:name with wrong session returns null", () => {
		expect(resolveTarget(windows, "apps:movingavg")).toBeNull();
	});

	it("session:index resolves by window index", () => {
		expect(resolveTarget(windows, "apps:2")?.name).toBe("metronome");
	});

	it("is case-insensitive on session and name", () => {
		expect(resolveTarget(windows, "DEV:MovingAvg")?.name).toBe("movingavg");
	});
});

describe("resolveTarget — empty / whitespace", () => {
	const windows = parseWindows(WINDOWS_FIXTURE);

	it("empty string returns null", () => {
		expect(resolveTarget(windows, "")).toBeNull();
	});

	it("whitespace-only returns null", () => {
		expect(resolveTarget(windows, "   ")).toBeNull();
	});

	it("trims the target before matching", () => {
		expect(resolveTarget(windows, "  movingavg  ")?.name).toBe("movingavg");
	});
});

describe("selectWindowArgs / labels / values", () => {
	const window: TmuxWindow = {
		session: "dev",
		index: 2,
		name: "movingavg",
		active: false,
		id: "@5",
			serverPid: "100",
	};

	it("selectWindowArgs builds select-window args", () => {
		expect(selectWindowArgs(window)).toEqual([
			"select-window",
			"-t",
			"dev:2",
		]);
	});

	it("tmuxWindowLabel formats a human-readable label", () => {
		expect(tmuxWindowLabel(window)).toBe("dev: movingavg");
	});

});

describe("resolveTarget — session:@id (tmux window id)", () => {
	const windows = parseWindows("dev|7|0|@7|100|claude\ndev|8|1|@8|100|claude\nops|1|1|@3|100|claude\n");

	it("resolves to the window with that id in that session", () => {
		expect(resolveTarget(windows, "dev:@8#100")).toMatchObject({ session: "dev", index: 8, id: "@8", serverPid: "100" });
	});
	it("still finds the window after renumbering and renaming (the reason ids exist)", () => {
		// renumber-windows on: window 7 closed, @8 is now index 7 — and renamed.
		const after = parseWindows("dev|7|1|@8|100|renamed\nops|1|1|@3|100|claude\n");
		expect(resolveTarget(after, "dev:@8#100")).toMatchObject({ index: 7, name: "renamed", id: "@8", serverPid: "100" });
	});
	it("returns null when the window is gone, never falling back to a name or index", () => {
		// A window literally NAMED "@8#100" and one at index 8 must not answer for it.
		const after = parseWindows("dev|8|1|@20|100|@8#100\n");
		expect(resolveTarget(after, "dev:@8#100")).toBeNull();
	});
	it("returns null after a tmux server restart, when the same id names a different window", () => {
		// Measured on a scratch server: after kill-server, new windows get @0, @1, …
		// again, so "@8" alone would bind a stranger. The pid tells the servers apart.
		const restarted = parseWindows("dev|1|1|@8|200|claude\n");
		expect(resolveTarget(restarted, "dev:@8#100")).toBeNull();
	});
	it("treats @digits without a server pid as a NAME, as it always was", () => {
		const windows = parseWindows("dev|3|1|@3|100|@8\ndev|8|0|@8|100|other\n");
		expect(resolveTarget(windows, "dev:@8")).toMatchObject({ index: 3, name: "@8" });
	});
	it("matches the session exactly (tmux session names are case-sensitive)", () => {
		const mixed = parseWindows("Dev|8|1|@8|100|claude\ndev|8|1|@9|100|claude\n");
		expect(resolveTarget(mixed, "dev:@9#100")).toMatchObject({ session: "dev", id: "@9", serverPid: "100" });
		expect(resolveTarget(mixed, "dev:@8#100")).toBeNull();
	});
});

describe("exactTargetFor", () => {
	// Real tmux ids are "@<n>", unique per server; derive one from the index,
	// offset by session so two sessions never share it.
	const w = (session: string, index: number, name: string, active = false): TmuxWindow =>
		({ session, index, name, active, id: `@${(session === "dev" ? 100 : session === "Dev" ? 200 : 300) + index}`, serverPid: "100" });

	it("uses session:name when the name is unique in its session", () => {
		const windows = [w("dev", 2, "movingavg"), w("dev", 3, "logs"), w("ops", 1, "movingavg")];
		expect(exactTargetFor(windows, windows[0])).toBe("dev:movingavg");
	});
	it("uses session:@id for EVERY window sharing a name — the first one too", () => {
		// A name target for the first duplicate would move to the second when the
		// first closes, so neither duplicate is bound by name.
		const windows = [w("dev", 7, "claude"), w("dev", 8, "claude")];
		expect(exactTargetFor(windows, windows[0])).toBe("dev:@107#100");
		expect(exactTargetFor(windows, windows[1])).toBe("dev:@108#100");
	});
	it("treats names that differ only in case as shared (the resolver ignores case)", () => {
		const windows = [w("dev", 1, "Claude"), w("dev", 4, "claude")];
		// The FIRST one matters most: "dev:Claude" resolves to it today, so only the
		// shared-name rule stops it binding by a name that is not unique.
		expect(exactTargetFor(windows, windows[0])).toBe("dev:@101#100");
		expect(exactTargetFor(windows, windows[1])).toBe("dev:@104#100");
	});
	it("treats sessions that differ only in case as one for name sharing", () => {
		const windows = [w("Dev", 8, "claude"), w("dev", 8, "claude")];
		const target = exactTargetFor(windows, windows[1]);
		expect(target).toBe("dev:@108#100");
		expect(resolveTarget(windows, target)).toBe(windows[1]);
	});
	it("uses the id when a numeric name would resolve as another window's index", () => {
		const windows = [w("dev", 2, "logs"), w("dev", 5, "2")];
		expect(exactTargetFor(windows, windows[1])).toBe("dev:@105#100");
	});
	it("every target it returns resolves back to exactly that window", () => {
		const windows = [w("dev", 2, "logs"), w("dev", 5, "2"), w("dev", 7, "claude"), w("dev", 8, "Claude"), w("ops", 1, "claude")];
		for (const win of windows) expect(resolveTarget(windows, exactTargetFor(windows, win))).toBe(win);
	});
	it("returns \"\" when the name is shared and the server pid is missing", () => {
		const windows: TmuxWindow[] = [
			{ session: "dev", index: 7, name: "claude", active: false, id: "@7", serverPid: "" },
			{ session: "dev", index: 8, name: "claude", active: false, id: "@8", serverPid: "" },
		];
		expect(exactTargetFor(windows, windows[1])).toBe("");
	});
	it("returns \"\" when the name is shared and there is no id to fall back on", () => {
		const windows: TmuxWindow[] = [
			{ session: "dev", index: 7, name: "claude", active: false, id: "", serverPid: "100" },
			{ session: "dev", index: 8, name: "claude", active: false, id: "", serverPid: "100" },
		];
		expect(exactTargetFor(windows, windows[1])).toBe("");
	});
});

describe("tmuxWindowOptions (the settings dropdown)", () => {
	it("gives same-named windows distinct values and labels that tell them apart", () => {
		const windows = parseWindows("dev|2|0|@2|100|movingavg\ndev|7|0|@7|100|claude\ndev|8|1|@8|100|claude\n");
		expect(tmuxWindowOptions(windows)).toEqual({
			items: [
				{ label: "dev: movingavg", value: "dev:movingavg" },
				{ label: "dev: claude (window 7)", value: "dev:@7#100" },
				{ label: "dev: claude (window 8)", value: "dev:@8#100" },
			],
			skipped: 0,
		});
	});
	it("counts, rather than offers, a window no target can name", () => {
		const windows: TmuxWindow[] = [
			{ session: "dev", index: 7, name: "claude", active: false, id: "", serverPid: "100" },
			{ session: "dev", index: 8, name: "claude", active: false, id: "", serverPid: "100" },
		];
		expect(tmuxWindowOptions(windows)).toEqual({ items: [], skipped: 2 });
	});
});

describe("sessionForTty", () => {
	const clients = new Map([
		["dev", "/dev/ttys007"],
		["ops", "/dev/ttys011"],
	]);
	it("finds the session attached to a tty", () => {
		expect(sessionForTty(clients, "/dev/ttys011")).toBe("ops");
	});
	it("null for an unknown tty", () => {
		expect(sessionForTty(clients, "/dev/ttys099")).toBeNull();
	});
	it("null for an empty tty (never match a session with no client)", () => {
		expect(sessionForTty(clients, "")).toBeNull();
	});
});
