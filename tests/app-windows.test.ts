import { describe, it, expect } from "vitest";
import { rotationDirection } from "../src/mac/rotation.js";
import {
	appWindowCycleScript,
	parseFrontWindow,
	FRONT_WINDOW_SCRIPT,
} from "../src/mac/app-windows.js";

describe("rotationDirection", () => {
	it("maps sign to next/prev/none with truncation", () => {
		expect(rotationDirection(1)).toBe("next");
		expect(rotationDirection(-2)).toBe("prev");
		expect(rotationDirection(0)).toBe("none");
		expect(rotationDirection(0.9)).toBe("none");
	});
});

describe("appWindowCycleScript", () => {
	it("next uses Cmd+` (key code 50, command only)", () => {
		const s = appWindowCycleScript("next");
		expect(s).toContain("key code 50 using {command down}");
		expect(s).not.toContain("shift down");
	});
	it("prev adds shift", () => {
		expect(appWindowCycleScript("prev")).toContain("key code 50 using {command down, shift down}");
	});
});

describe("parseFrontWindow", () => {
	it("splits app|title", () => {
		expect(parseFrontWindow("Safari|Inbox — Gmail")).toEqual({ app: "Safari", title: "Inbox — Gmail" });
	});
	it("keeps later pipes in the title", () => {
		expect(parseFrontWindow("Code|a|b").title).toBe("a|b");
	});
	it("handles no window (trailing pipe)", () => {
		expect(parseFrontWindow("Finder|")).toEqual({ app: "Finder", title: "" });
	});
	it("FRONT_WINDOW_SCRIPT targets the frontmost process", () => {
		expect(FRONT_WINDOW_SCRIPT).toContain("frontmost is true");
	});
});
