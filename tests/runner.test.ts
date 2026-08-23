import { describe, it, expect, vi } from "vitest";
import {
	runAppleScript,
	runAppleScriptWithArgs,
	runJxa,
	runJxaWithArgs,
	runJxaWithStdin,
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

describe("runAppleScriptWithArgs", () => {
	it("calls exec with /usr/bin/osascript and [-e, script, --, ...args]", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(null, "ok\n", "");
			return undefined;
		});
		await runAppleScriptWithArgs("on run argv\nend run", ["a b", "c\"d"], exec);
		expect(exec).toHaveBeenCalledTimes(1);
		const [file, args] = exec.mock.calls[0];
		expect(file).toBe("/usr/bin/osascript");
		expect(args).toEqual(["-e", "on run argv\nend run", "--", "a b", "c\"d"]);
	});

	it("delivers args as data — a hostile arg is never concatenated into the script text", async () => {
		let seenArgs: readonly string[] = [];
		const exec = vi.fn<ExecFileLike>((_file, args, _opts, cb) => {
			seenArgs = args;
			cb(null, "ok", "");
			return undefined;
		});
		const hostile = `" & (do shell script "echo PWNED") & "`;
		await runAppleScriptWithArgs("on run argv\nend run", [hostile], exec);
		// The hostile string is a distinct argv element, not spliced into the
		// script (index 1), which is exactly what keeps it inert data.
		expect(seenArgs[1]).not.toContain(hostile);
		expect(seenArgs).toContain(hostile);
	});

	it("classifies a permission failure the same way runAppleScript does", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(new Error("exit 1"), "", "not allowed assistive access (-1719)");
			return undefined;
		});
		const result = await runAppleScriptWithArgs("SCRIPT", ["x"], exec);
		expect(result).toMatchObject({ ok: false, code: "permission-denied" });
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

describe("runJxaWithArgs", () => {
	it("calls exec with the JavaScript flag and [-e, script, --, ...args]", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(null, "ok\n", "");
			return undefined;
		});
		await runJxaWithArgs("function run(argv) {}", ["123", "com.apple.Terminal"], exec);
		expect(exec).toHaveBeenCalledTimes(1);
		const [file, args] = exec.mock.calls[0];
		expect(file).toBe("/usr/bin/osascript");
		expect(args).toEqual(["-l", "JavaScript", "-e", "function run(argv) {}", "--", "123", "com.apple.Terminal"]);
	});

	it("classifies a permission failure the same way runAppleScript does", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(new Error("exit 1"), "", "not allowed assistive access (-1719)");
			return undefined;
		});
		const result = await runJxaWithArgs("SCRIPT", ["x"], exec);
		expect(result).toMatchObject({ ok: false, code: "permission-denied" });
	});
});

describe("runJxaWithStdin", () => {
	it("calls exec with [-l, JavaScript, -e, script] (no argv) and writes+ends stdin", async () => {
		const writes: Array<{ chunk: string; encoding: string }> = [];
		let ended = false;
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(null, "ok\n", "");
			return {
				stdin: {
					write: (chunk: string, encoding: string) => {
						writes.push({ chunk, encoding });
						return true;
					},
					end: () => {
						ended = true;
					},
				},
			};
		});
		const result = await runJxaWithStdin("function run() {}", "the snippet text", exec);
		expect(exec).toHaveBeenCalledTimes(1);
		const [file, args] = exec.mock.calls[0];
		expect(file).toBe("/usr/bin/osascript");
		expect(args).toEqual(["-l", "JavaScript", "-e", "function run() {}"]);
		expect(writes).toEqual([{ chunk: "the snippet text", encoding: "utf8" }]);
		expect(ended).toBe(true);
		expect(result.ok).toBe(true);
	});

	it("delivers input as data — a hostile payload is never concatenated into the script text", async () => {
		let seenScript = "";
		let seenStdin = "";
		const exec = vi.fn<ExecFileLike>((_file, args, _opts, cb) => {
			seenScript = String(args[3]);
			cb(null, "ok", "");
			return {
				stdin: {
					write: (chunk: string) => {
						seenStdin = chunk;
						return true;
					},
					end: () => undefined,
				},
			};
		});
		const hostile = `" & (do shell script "echo PWNED") & "`;
		await runJxaWithStdin("function run() {}", hostile, exec);
		expect(seenScript).not.toContain(hostile);
		expect(seenStdin).toBe(hostile);
	});

	it("tolerates a fake exec whose return value has no stdin", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(null, "ok", "");
			return undefined;
		});
		await expect(runJxaWithStdin("function run() {}", "text", exec)).resolves.toMatchObject({ ok: true });
	});

	it("classifies a permission failure the same way runAppleScript does", async () => {
		const exec = vi.fn<ExecFileLike>((_file, _args, _opts, cb) => {
			cb(new Error("exit 1"), "", "not allowed assistive access (-1719)");
			return { stdin: { write: () => true, end: () => undefined } };
		});
		const result = await runJxaWithStdin("SCRIPT", "x", exec);
		expect(result).toMatchObject({ ok: false, code: "permission-denied" });
	});
});
