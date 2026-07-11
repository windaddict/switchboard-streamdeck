import { describe, it, expect } from "vitest";
import {
	paneDialFeedback,
	paneStatusArgs,
	parsePaneStatus,
	selectPaneArgs,
	togglePaneDialMode,
} from "../src/mac/tmux-pane.js";

describe("selectPaneArgs", () => {
	it("next => select-pane -t +", () => {
		expect(selectPaneArgs("next")).toEqual(["select-pane", "-t", "+"]);
	});
	it("prev => select-pane -t -", () => {
		expect(selectPaneArgs("prev")).toEqual(["select-pane", "-t", "-"]);
	});
	it("scopes to a session's current window when given (frontmost-window fix)", () => {
		expect(selectPaneArgs("next", "dev")).toEqual(["select-pane", "-t", "dev:.+"]);
		expect(selectPaneArgs("prev", "dev")).toEqual(["select-pane", "-t", "dev:.-"]);
	});
	it("null session falls back to the untargeted form", () => {
		expect(selectPaneArgs("next", null)).toEqual(["select-pane", "-t", "+"]);
	});
});

describe("togglePaneDialMode", () => {
	it("flips between panes and windows", () => {
		expect(togglePaneDialMode("panes")).toBe("windows");
		expect(togglePaneDialMode("windows")).toBe("panes");
	});
});

describe("parsePaneStatus", () => {
	it("parses command|paneIndex|paneCount|windowName", () => {
		expect(parsePaneStatus("vim|1|3|movingavg\n")).toEqual({
			command: "vim",
			paneIndex: 1,
			paneCount: 3,
			windowName: "movingavg",
		});
	});
	it("keeps pipes inside the window name (it is the LAST field)", () => {
		expect(parsePaneStatus("zsh|0|2|a|b").windowName).toBe("a|b");
	});
	it("degrades missing/garbage fields to defaults", () => {
		expect(parsePaneStatus("")).toEqual({ command: "", paneIndex: 0, paneCount: 0, windowName: "" });
		expect(parsePaneStatus("zsh|x|y")).toEqual({
			command: "zsh",
			paneIndex: 0,
			paneCount: 0,
			windowName: "",
		});
	});
	it("paneStatusArgs asks for exactly those fields, window name last", () => {
		expect(paneStatusArgs()).toEqual([
			"display-message",
			"-p",
			"#{pane_current_command}|#{pane_index}|#{window_panes}|#{window_name}",
		]);
	});
	it("paneStatusArgs scopes to a session when given", () => {
		expect(paneStatusArgs("dev")).toEqual([
			"display-message",
			"-p",
			"-t",
			"dev",
			"#{pane_current_command}|#{pane_index}|#{window_panes}|#{window_name}",
		]);
	});
});

describe("paneDialFeedback", () => {
	const status = { command: "vim", paneIndex: 1, paneCount: 3, windowName: "movingavg" };
	it("panes mode: tmux-prefixed phosphor mode label + command with 1-based position", () => {
		expect(paneDialFeedback("panes", status)).toEqual({
			mode: { value: "tmux Panes ⇄", color: "#3ECF6E" },
			current: "vim · 2/3",
		});
	});
	it("windows mode: tmux-prefixed label (never confusable with the App Windows dial)", () => {
		expect(paneDialFeedback("windows", status)).toEqual({
			mode: { value: "tmux Windows ⇄", color: "#3ECF6E" },
			current: "movingavg",
		});
	});
	it("omits the position when the pane count is unknown", () => {
		expect(paneDialFeedback("panes", { ...status, paneCount: 0 }).current).toBe("vim");
	});
	it("falls back to placeholders when tmux reports nothing", () => {
		const empty = { command: "", paneIndex: 0, paneCount: 0, windowName: "" };
		expect(paneDialFeedback("panes", empty).current).toBe("—");
		expect(paneDialFeedback("windows", empty).current).toBe("—");
	});
});
