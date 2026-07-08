import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LONG_PRESS_MS, PressGate } from "../src/mac/press-gate.js";

describe("PressGate", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("release before the threshold is a short press and does not fire onHold", () => {
		const gate = new PressGate();
		const onHold = vi.fn();
		gate.down("a", onHold);
		vi.advanceTimersByTime(LONG_PRESS_MS - 1);
		expect(gate.up("a")).toBe(true);
		vi.runAllTimers();
		expect(onHold).not.toHaveBeenCalled();
	});

	it("fires onHold AT the threshold, not on release", () => {
		const gate = new PressGate();
		const onHold = vi.fn();
		gate.down("a", onHold);
		vi.advanceTimersByTime(LONG_PRESS_MS);
		expect(onHold).toHaveBeenCalledTimes(1);
	});

	it("release after the hold fired is NOT a short press (no double action)", () => {
		const gate = new PressGate();
		gate.down("a", vi.fn());
		vi.advanceTimersByTime(LONG_PRESS_MS);
		expect(gate.up("a")).toBe(false);
	});

	it("up without a down is not a short press", () => {
		expect(new PressGate().up("a")).toBe(false);
	});

	it("keys are independent (two buttons held at once)", () => {
		const gate = new PressGate();
		const holdA = vi.fn();
		const holdB = vi.fn();
		gate.down("a", holdA);
		vi.advanceTimersByTime(200);
		gate.down("b", holdB);
		vi.advanceTimersByTime(LONG_PRESS_MS - 200);
		expect(holdA).toHaveBeenCalledTimes(1); // a reached its threshold
		expect(gate.up("b")).toBe(true); // b released early
		vi.runAllTimers();
		expect(holdB).not.toHaveBeenCalled();
	});

	it("a second down re-arms instead of stacking timers", () => {
		const gate = new PressGate();
		const first = vi.fn();
		const second = vi.fn();
		gate.down("a", first);
		vi.advanceTimersByTime(300);
		gate.down("a", second);
		vi.advanceTimersByTime(LONG_PRESS_MS);
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("cancel disarms without firing", () => {
		const gate = new PressGate();
		const onHold = vi.fn();
		gate.down("a", onHold);
		gate.cancel("a");
		vi.runAllTimers();
		expect(onHold).not.toHaveBeenCalled();
		expect(gate.up("a")).toBe(false);
	});

	it("honours a custom threshold", () => {
		const gate = new PressGate(100);
		const onHold = vi.fn();
		gate.down("a", onHold);
		vi.advanceTimersByTime(100);
		expect(onHold).toHaveBeenCalledTimes(1);
	});
});
