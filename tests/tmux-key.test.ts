import { describe, it, expect } from "vitest";
import { buildTmuxKeyImage, evaluateKeyStatus } from "../src/mac/tmux-key.js";
import type { TmuxWindow } from "../src/mac/tmux.js";

const WINDOWS: TmuxWindow[] = [
	{ session: "dev", index: 1, name: "movingavg", active: true },
	{ session: "dev", index: 2, name: "logs", active: false },
	{ session: "ops", index: 1, name: "deploy", active: true },
];
const CLIENTS = new Map([
	["dev", "/dev/ttys007"],
	["ops", "/dev/ttys011"],
]);

/** Baseline where every hot-chain link holds for dev:movingavg. */
const HOT = {
	windows: WINDOWS,
	clients: CLIENTS,
	target: "dev:movingavg",
	iTermFrontmost: true,
	focusedTty: "/dev/ttys007",
};

describe("evaluateKeyStatus — the hot chain", () => {
	it("hot when every link holds", () => {
		expect(evaluateKeyStatus(HOT)).toEqual({ state: "hot", session: "dev", window: "movingavg" });
	});
	it("cold when the window is not its session's active window", () => {
		expect(evaluateKeyStatus({ ...HOT, target: "dev:logs" }).state).toBe("cold");
	});
	it("cold when iTerm is not the frontmost app", () => {
		expect(evaluateKeyStatus({ ...HOT, iTermFrontmost: false }).state).toBe("cold");
	});
	it("cold when iTerm's focused session sits on another tty (e.g. an unfocused split)", () => {
		expect(evaluateKeyStatus({ ...HOT, focusedTty: "/dev/ttys011" }).state).toBe("cold");
	});
	it("cold when the session has no attached client", () => {
		expect(evaluateKeyStatus({ ...HOT, clients: new Map() }).state).toBe("cold");
	});
	it("cold rather than hot on an empty focused tty (never match '' === '')", () => {
		expect(
			evaluateKeyStatus({ ...HOT, clients: new Map([["dev", ""]]), focusedTty: "" }).state,
		).toBe("cold");
	});
	it("unknown when the target does not resolve (window gone / no server)", () => {
		const got = evaluateKeyStatus({ ...HOT, windows: [], target: "dev:gone" });
		expect(got).toEqual({ state: "unknown", session: "", window: "dev:gone" });
	});
	it("unknown for an unconfigured button", () => {
		expect(evaluateKeyStatus({ ...HOT, target: "" }).state).toBe("unknown");
	});
});

describe("buildTmuxKeyImage", () => {
	const hot = buildTmuxKeyImage({ state: "hot", session: "dev", window: "movingavg" });
	const cold = buildTmuxKeyImage({ state: "cold", session: "dev", window: "movingavg" });
	const unknown = buildTmuxKeyImage({ state: "unknown", session: "", window: "dev:gone" });

	it("hot lights the status bar and shows the block cursor", () => {
		expect(hot).toContain('fill="url(#b)"'); // lit bar
		expect(hot).toContain('fill="#F2FFF6"'); // cursor block
	});
	it("cold hollows the bar and drops the cursor", () => {
		expect(cold).toContain('fill="none"');
		expect(cold).not.toContain("#F2FFF6");
	});
	it("unknown renders gray with a dashed bar", () => {
		expect(unknown).toContain("stroke-dasharray");
		expect(unknown).not.toContain("#F2FFF6");
	});
	it("shows the session as an uppercase eyebrow and the window name", () => {
		expect(hot).toContain(">DEV</text>");
		expect(hot).toContain(">movingavg</text>");
	});
	it("truncates a long window name to fit the 72px face", () => {
		const svg = buildTmuxKeyImage({ state: "cold", session: "dev", window: "supercalifragilistic" });
		expect(svg).toContain(">supercal…</text>");
	});
	it("XML-escapes user text", () => {
		const svg = buildTmuxKeyImage({ state: "cold", session: "a&b", window: "<x>" });
		expect(svg).toContain("&lt;x&gt;");
		expect(svg).toContain("A&amp;B");
	});
	it("labels an unconfigured button plainly", () => {
		expect(buildTmuxKeyImage({ state: "unknown", session: "", window: "" })).toContain(
			">no target</text>",
		);
	});
	it("carries the split-pane tmux mark in every state (identity even when idle)", () => {
		for (const svg of [hot, cold, unknown]) {
			expect(svg).toContain('<path d="M10 60.5v8"'); // the pane divider
		}
	});
	it("glyph attributes sit on the elements themselves (SD's rasterizer does not inherit from <g>)", () => {
		expect(hot).not.toContain("<g ");
		expect(hot).toMatch(/<path d="M10 60\.5v8" fill="none" stroke="/);
	});
	it("emits NO hsl() literals — SD's key rasterizer paints them black", () => {
		for (const svg of [hot, cold, unknown]) {
			expect(svg).not.toContain("hsl(");
		}
	});
});
