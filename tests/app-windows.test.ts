import { describe, it, expect } from "vitest";
import { rotationDirection } from "../src/mac/rotation.js";
import {
	appCycleScript,
	appWindowCycleScript,
	appWindowsFeedback,
	FRONT_WINDOW_SCRIPT,
	parseFrontWindow,
	toggleAppWindowsMode,
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

describe("toggleAppWindowsMode", () => {
	it("flips between windows and apps", () => {
		expect(toggleAppWindowsMode("windows")).toBe("apps");
		expect(toggleAppWindowsMode("apps")).toBe("windows");
	});
});

describe("appCycleScript", () => {
	it("cycles only VISIBLE application processes", () => {
		expect(appCycleScript("next")).toContain("whose visible is true");
	});
	it("next steps forward and wraps past the end", () => {
		const s = appCycleScript("next");
		expect(s).toContain("set targetIdx to frontIdx + 1");
		expect(s).toContain("if targetIdx > n then set targetIdx to 1");
	});
	it("prev steps backward and wraps past the start", () => {
		const s = appCycleScript("prev");
		expect(s).toContain("set targetIdx to frontIdx - 1");
		expect(s).toContain("if targetIdx < 1 then set targetIdx to n");
	});
	it("raises the target instead of sending keystrokes (no Cmd+Tab emulation)", () => {
		const s = appCycleScript("next");
		expect(s).toContain("set frontmost of item targetIdx of procs to true");
		expect(s).not.toContain("keystroke");
		expect(s).not.toContain("key code");
	});
});

describe("appWindowsFeedback", () => {
	const front = { app: "Safari", title: "Inbox" };
	it("uses custom layout keys, NOT the $B1 title (which is user-title-bound and ignores pushes)", () => {
		expect(Object.keys(appWindowsFeedback("windows", front)).sort()).toEqual(["current", "mode"]);
	});
	it("the mode line names what rotation moves through, with the toggle hint", () => {
		expect(appWindowsFeedback("windows", front).mode).toBe("Windows \u21c4");
		expect(appWindowsFeedback("apps", front).mode).toBe("Apps \u21c4");
	});
	it("windows mode shows the window title as the current line", () => {
		expect(appWindowsFeedback("windows", front).current).toBe("Inbox");
	});
	it("windows mode falls back to the app name for a title-less window", () => {
		expect(appWindowsFeedback("windows", { app: "Finder", title: "" }).current).toBe("Finder");
	});
	it("apps mode shows the front app as the current line", () => {
		expect(appWindowsFeedback("apps", front).current).toBe("Safari");
	});
	it("falls back to placeholders when nothing is frontmost", () => {
		expect(appWindowsFeedback("windows", { app: "", title: "" }).current).toBe("\u2014");
		expect(appWindowsFeedback("apps", { app: "", title: "" }).current).toBe("\u2014");
	});
});
