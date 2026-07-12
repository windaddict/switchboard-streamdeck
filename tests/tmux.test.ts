import { describe, it, expect } from "vitest";
import {
	parseWindows,
	parseClients,
	sessionForTty,
	resolveTarget,
	selectWindowArgs,
	tmuxWindowLabel,
	tmuxWindowValue,
	type TmuxWindow,
} from "../src/mac/tmux.js";

const WINDOWS_FIXTURE =
	"apps|1|0|copybug\napps|2|1|metronome\napps|3|0|passages\ndev|1|1|ea-system\ndev|2|0|movingavg\ndev|3|0|medtech\n";

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
		const windows = parseWindows("dev|4|1|api|logs\n");
		expect(windows).toEqual([{ session: "dev", index: 4, name: "api|logs", active: true }]);
	});
	it("skips blank and short (<4 field) lines", () => {
		const input =
			"apps|1|0|copybug\n\n   \nbad|line\ndev|2|0|movingavg\n";
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

describe("resolveTarget — bare names", () => {
	const windows = parseWindows(WINDOWS_FIXTURE);

	it("exact name match", () => {
		expect(resolveTarget(windows, "movingavg")).toEqual({
			session: "dev",
			index: 2,
			name: "movingavg",
			active: false,
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
			{ session: "dev", index: 1, name: "ea-system", active: false },
			{ session: "dev", index: 2, name: "ea", active: false },
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

	it("tmuxWindowValue formats a stable value", () => {
		expect(tmuxWindowValue(window)).toBe("dev:movingavg");
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
