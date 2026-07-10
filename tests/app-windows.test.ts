import { describe, it, expect } from "vitest";
import { rotationDirection } from "../src/mac/rotation.js";
import {
	appCycleJxa,
	appWindowCycleScript,
	appWindowsFeedback,
	FRONT_APP_BUNDLE_JXA,
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

describe("appCycleJxa", () => {
	it("queries NSWorkspace directly (no System Events round-trip)", () => {
		const s = appCycleJxa("next");
		expect(s).toContain("$.NSWorkspace.sharedWorkspace.runningApplications");
		expect(s).not.toContain("System Events");
	});
	it("cycles only visible REGULAR apps (no background agents, no hidden apps)", () => {
		const s = appCycleJxa("next");
		expect(s).toContain("NSApplicationActivationPolicyRegular");
		expect(s).toContain("!a.hidden");
	});
	it("next steps forward with wrap via modulo", () => {
		expect(appCycleJxa("next")).toContain("regular[(frontIdx + 1) % regular.length]");
	});
	it("prev steps backward with wrap via modulo", () => {
		expect(appCycleJxa("prev")).toContain("regular[(frontIdx - 1 + regular.length) % regular.length]");
	});
	it("activates the target and returns its name (no keystroke emulation)", () => {
		const s = appCycleJxa("next");
		expect(s).toContain("target.activateWithOptions");
		expect(s).toContain("target.localizedName");
		expect(s).not.toContain("keystroke");
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

describe("FRONT_APP_BUNDLE_JXA", () => {
	it("asks NSWorkspace for the frontmost app's bundle identifier", () => {
		expect(FRONT_APP_BUNDLE_JXA).toContain("frontmostApplication");
		expect(FRONT_APP_BUNDLE_JXA).toContain("bundleIdentifier");
	});
	it("degrades to \"\" when nothing is frontmost", () => {
		expect(FRONT_APP_BUNDLE_JXA).toContain('return ""');
	});
});
