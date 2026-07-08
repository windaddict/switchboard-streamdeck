import { describe, it, expect, vi } from "vitest";
import {
	runAppleScript,
	runJxa,
	classifyError,
	type ExecFileLike,
} from "../src/safari/runner.js";

describe("classifyError", () => {
	it("maps -1743 to permission-denied", () => {
		expect(classifyError("execution error: ... (-1743)")).toBe("permission-denied");
	});
	it('maps "Not authorized to send Apple events" to permission-denied', () => {
		expect(classifyError("Not authorized to send Apple events.")).toBe("permission-denied");
	});
	it("maps an arbitrary other error to error", () => {
		expect(classifyError("syntax error: Expected end of line")).toBe("error");
	});
});

describe("runAppleScript", () => {
	it("resolves success when exec callback returns no error", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(null, "ok\n", "");
			return undefined;
		});
		const result = await runAppleScript("SCRIPT", exec);
		expect(result).toMatchObject({ ok: true, code: "success", stdout: "ok\n" });
	});

	it("calls exec with /usr/bin/osascript and [-e, script]", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(null, "ok\n", "");
			return undefined;
		});
		await runAppleScript("MY_SCRIPT", exec);
		expect(exec).toHaveBeenCalledTimes(1);
		const [file, args] = exec.mock.calls[0];
		expect(file).toBe("/usr/bin/osascript");
		expect(args).toEqual(["-e", "MY_SCRIPT"]);
	});

	it("classifies a -1743 stderr failure as permission-denied", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(new Error("exit 1"), "", "execution error (-1743)");
			return undefined;
		});
		const result = await runAppleScript("SCRIPT", exec);
		expect(result).toMatchObject({ ok: false, code: "permission-denied" });
	});

	it("classifies a generic error with unrelated stderr as error", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(new Error("exit 1"), "", "syntax error somewhere");
			return undefined;
		});
		const result = await runAppleScript("SCRIPT", exec);
		expect(result).toMatchObject({ ok: false, code: "error" });
	});
});

describe("runJxa", () => {
	it("invokes osascript with the JavaScript language flag", async () => {
		let seen: readonly string[] = [];
		const exec = ((_file: string, args: readonly string[], _o: object, cb: (e: Error | null, so: string, se: string) => void) => {
			seen = args;
			cb(null, "Safari", "");
		}) as never;
		const result = await runJxa("function run() { return 1; }", exec);
		expect(seen.slice(0, 2)).toEqual(["-l", "JavaScript"]);
		expect(result.ok).toBe(true);
		expect(result.stdout).toBe("Safari");
	});
});
