import { describe, expect, it } from "vitest";

import {
	describeDroppedPress,
	describeFailedPress,
	describeTakeover,
} from "../src/mac/focus-outcome.js";

/**
 * These pin the three ways a focus press departs from the golden path. Every one
 * of them used to be invisible, which is why the wedge that prompted this took
 * an operator noticing dead keys rather than a log line.
 */
describe("What the deck and the log say about a focus press", () => {
	describe("a press dropped because another raise holds the key", () => {
		const report = describeDroppedPress("AI Project", "iterm-focus", 1234.7);

		it("alerts, so an ignored press cannot look like one that worked", () => {
			expect(report.alert).toBe(true);
		});

		it("warns rather than errors — contention is ordinary, not a fault", () => {
			expect(report.level).toBe("warn");
		});

		it("names the action and the hold age, rounded", () => {
			expect(report.message).toContain("AI Project");
			expect(report.message).toContain("1235ms");
			expect(report.message).not.toContain("1234.7"); // no float noise in the log
		});
	});

	describe("a press that took the key from a stuck holder", () => {
		const report = describeTakeover("Focus tmux Window", "iterm-focus", 46000);

		it("does NOT alert — this press is going on to do its work", () => {
			expect(report.alert).toBe(false);
		});

		it("errors, because every focus key was dead until this press", () => {
			expect(report.level).toBe("error");
			expect(report.message).toContain("Focus tmux Window");
			expect(report.message).toContain("46000ms");
			expect(report.message).toContain("every focus key was dead");
		});
	});

	describe("a raise that threw", () => {
		it("alerts and carries the error's own message", () => {
			const report = describeFailedPress("Codex Project", new Error("osascript died"));
			expect(report).toEqual({
				level: "error",
				message: "Codex Project: raise failed — osascript died",
				alert: true,
			});
		});

		it("survives a thrown non-Error", () => {
			expect(describeFailedPress("Cursor Project", "just a string").message).toContain("just a string");
		});
	});

	/** The three reports must stay distinguishable in a log: an operator reading
	 * back a wedge needs to tell contention from recovery from failure. */
	it("gives the three events distinct messages", () => {
		const messages = [
			describeDroppedPress("X", "k", 1).message,
			describeTakeover("X", "k", 1).message,
			describeFailedPress("X", new Error("e")).message,
		];
		expect(new Set(messages).size).toBe(3);
	});
});
