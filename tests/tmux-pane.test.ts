import { describe, it, expect } from "vitest";
import {
	selectPaneArgs,
	paneIsInMode,
	PANE_IN_MODE_ARGS,
	CANCEL_MODE_ARGS,
	ZOOM_PANE_ARGS,
} from "../src/mac/tmux-pane.js";

describe("selectPaneArgs", () => {
	it("next => select-pane -t +", () => {
		expect(selectPaneArgs("next")).toEqual(["select-pane", "-t", "+"]);
	});
	it("prev => select-pane -t -", () => {
		expect(selectPaneArgs("prev")).toEqual(["select-pane", "-t", "-"]);
	});
});

describe("copy-mode args", () => {
	it("reads pane_in_mode", () => {
		expect(PANE_IN_MODE_ARGS).toEqual(["display-message", "-p", "#{pane_in_mode}"]);
	});
	it("cancels copy-mode", () => {
		expect(CANCEL_MODE_ARGS).toEqual(["send-keys", "-X", "cancel"]);
	});
});

describe("paneIsInMode", () => {
	it("'1' => true", () => expect(paneIsInMode("1")).toBe(true));
	it("trims whitespace/newline", () => expect(paneIsInMode(" 1 \n")).toBe(true));
	it("'0' => false", () => expect(paneIsInMode("0")).toBe(false));
	it("empty => false", () => expect(paneIsInMode("")).toBe(false));
});

describe("ZOOM_PANE_ARGS", () => {
	it("toggles zoom via resize-pane -Z", () => {
		expect(ZOOM_PANE_ARGS).toEqual(["resize-pane", "-Z"]);
	});
});
