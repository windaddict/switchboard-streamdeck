import { describe, it, expect } from "vitest";
import { axcheckHelperPath, checkAccessibility, type ExecFileLike } from "../src/mac/permissions.js";

const BASE = "file:///Plugins/x.sdPlugin/bin/plugin.js";

function execYielding(stdout: string, error: Error | null = null): ExecFileLike {
	return (_file, _args, _opts, cb) => {
		cb(error, stdout, "");
		return undefined;
	};
}

describe("axcheckHelperPath", () => {
	it("resolves the helper next to the bundled entry point", () => {
		expect(axcheckHelperPath(BASE)).toBe("/Plugins/x.sdPlugin/bin/macos/axcheck");
	});
});

describe("checkAccessibility", () => {
	it("is true when the helper reports trusted", async () => {
		expect(await checkAccessibility(BASE, execYielding("trusted\n"))).toBe(true);
	});

	it("is false only on a definitive untrusted", async () => {
		expect(await checkAccessibility(BASE, execYielding("untrusted\n"))).toBe(false);
	});

	it("does not raise a false alarm on a spawn error (missing helper)", async () => {
		expect(await checkAccessibility(BASE, execYielding("", new Error("ENOENT")))).toBe(true);
	});

	it("treats unexpected output as granted (no false alarm)", async () => {
		expect(await checkAccessibility(BASE, execYielding("???"))).toBe(true);
	});

	it("tolerates surrounding whitespace", async () => {
		expect(await checkAccessibility(BASE, execYielding("  untrusted  "))).toBe(false);
	});
});
