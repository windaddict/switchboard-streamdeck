import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the three probe dependencies so the race is controllable.
const jxa = vi.hoisted(() => vi.fn());
const applescript = vi.hoisted(() => vi.fn());
const tmux = vi.hoisted(() => vi.fn());
vi.mock("../src/applescript/runner.js", () => ({
	runJxa: jxa,
	runAppleScript: applescript,
}));
vi.mock("../src/mac/tmux-runner.js", () => ({
	LIST_CLIENTS_ARGS: ["list-clients"],
	runTmux: tmux,
}));

import * as frontTmux from "../src/mac/front-tmux.js";
import { invalidateFrontTmux, resolveFrontTmux } from "../src/mac/front-tmux.js";

// `resolveFrontTmuxDetailed` is read off the namespace (not named in the import)
// so that, while it is absent, each test below fails on its own assertion instead
// of the whole file failing at import.
type Detailed =
	| { kind: "front"; front: { session: string; tty: string } }
	| { kind: "not-frontmost" }
	| { kind: "no-client" }
	| { kind: "probe-failed"; step: "front-app" | "iterm-tty" | "list-clients"; stderr: string };
const detailed = (path: string): Promise<Detailed> | undefined =>
	(frontTmux as unknown as { resolveFrontTmuxDetailed?: (p: string) => Promise<Detailed> }).resolveFrontTmuxDetailed?.(path);

const ITERM = { ok: true, stdout: "com.googlecode.iterm2\n", stderr: "", code: "success" };
const FAIL_RUN = { ok: false, stdout: "", stderr: "osascript exploded", code: "error" };


function primeProbe(tty: string, session: string) {
	jxa.mockResolvedValue({ ok: true, stdout: "com.googlecode.iterm2\n", stderr: "", code: "success" });
	applescript.mockResolvedValue({ ok: true, stdout: `${tty}\n`, stderr: "", code: "success" });
	tmux.mockResolvedValue({ ok: true, stdout: `${tty}|${session}\n`, stderr: "" });
}

afterEach(() => {
	invalidateFrontTmux();
	vi.clearAllMocks();
});

describe("resolveFrontTmux", () => {
	it("resolves the front session and caches it (one probe for two calls)", async () => {
		primeProbe("/dev/ttys007", "dev");
		const a = await resolveFrontTmux("/opt/tmux");
		const b = await resolveFrontTmux("/opt/tmux");
		expect(a).toEqual({ session: "dev", tty: "/dev/ttys007" });
		expect(b).toEqual(a);
		expect(jxa).toHaveBeenCalledTimes(1);
	});

	it("shares one in-flight probe among concurrent callers", async () => {
		primeProbe("/dev/ttys007", "dev");
		const [a, b] = await Promise.all([resolveFrontTmux("/opt/tmux"), resolveFrontTmux("/opt/tmux")]);
		expect(a).toEqual(b);
		expect(jxa).toHaveBeenCalledTimes(1);
	});

	it("a probe orphaned by invalidation must NOT publish stale state over a fresh result", async () => {
		// The world's state, mutable mid-test — mocks read it at call time.
		let tty = "/dev/OLD";
		let session = "old";
		const iterm = { ok: true, stdout: "com.googlecode.iterm2\n", stderr: "", code: "success" };
		applescript.mockImplementation(async () => ({ ok: true, stdout: `${tty}\n`, stderr: "", code: "success" }));
		tmux.mockImplementation(async () => ({ ok: true, stdout: `${tty}|${session}\n`, stderr: "" }));

		// Probe A stalls at the JXA step while holding pre-invalidation state.
		let releaseA!: (v: typeof iterm) => void;
		jxa.mockReturnValueOnce(new Promise((r) => (releaseA = r)));
		jxa.mockResolvedValue(iterm);
		const aPromise = resolveFrontTmux("/opt/tmux");

		// Focus changes; capture invalidates and probes fresh (probe B).
		invalidateFrontTmux();
		tty = "/dev/NEW";
		session = "new";
		const b = await resolveFrontTmux("/opt/tmux");
		expect(b).toEqual({ session: "new", tty: "/dev/NEW" });

		// The world reverts to OLD readings just as probe A limps home — A must
		// not publish them over B's fresh cache entry.
		tty = "/dev/OLD";
		session = "old";
		releaseA(iterm);
		await aPromise;

		const after = await resolveFrontTmux("/opt/tmux");
		expect(after).toEqual({ session: "new", tty: "/dev/NEW" });
	});

	it("null when iTerm is not frontmost, without querying iTerm", async () => {
		jxa.mockResolvedValue({ ok: true, stdout: "com.apple.mail\n", stderr: "", code: "success" });
		expect(await resolveFrontTmux("/opt/tmux")).toBeNull();
		expect(applescript).not.toHaveBeenCalled();
	});
});

describe("resolveFrontTmuxDetailed", () => {
	/** Each scenario scripts the three probes; `kind` is what the classifier must report. */
	const scenarios: Array<{ name: string; kind: Detailed["kind"]; step?: string; prime: () => void }> = [
		{
			name: "front app probe failure",
			kind: "probe-failed",
			step: "front-app",
			prime: () => {
				jxa.mockResolvedValue(FAIL_RUN);
			},
		},
		{
			name: "iTerm tty failure",
			kind: "probe-failed",
			step: "iterm-tty",
			prime: () => {
				jxa.mockResolvedValue(ITERM);
				applescript.mockResolvedValue(FAIL_RUN);
				tmux.mockResolvedValue({ ok: true, stdout: "/dev/ttys007|dev\n", stderr: "" });
			},
		},
		{
			name: "list-clients failure",
			kind: "probe-failed",
			step: "list-clients",
			prime: () => {
				jxa.mockResolvedValue(ITERM);
				applescript.mockResolvedValue({ ok: true, stdout: "/dev/ttys007\n", stderr: "", code: "success" });
				tmux.mockResolvedValue({ ok: false, stdout: "", stderr: "no server running", code: "error" });
			},
		},
		{
			name: "non-iTerm front app",
			kind: "not-frontmost",
			prime: () => {
				jxa.mockResolvedValue({ ok: true, stdout: "com.apple.mail\n", stderr: "", code: "success" });
			},
		},
		{
			name: "iTerm pane that is not a tmux client",
			kind: "no-client",
			prime: () => {
				jxa.mockResolvedValue(ITERM);
				applescript.mockResolvedValue({ ok: true, stdout: "/dev/ttys099\n", stderr: "", code: "success" });
				tmux.mockResolvedValue({ ok: true, stdout: "/dev/ttys007|dev\n", stderr: "" });
			},
		},
	];

	it("front app probe failure must classify as probe-failed", async () => {
		scenarios[0].prime();
		const r = await detailed("/opt/tmux");
		expect(r?.kind, "front app probe failure must classify as probe-failed").toBe("probe-failed");
		expect(r?.kind === "probe-failed" && r.step, "front app probe failure must name its step").toBe("front-app");
		expect(r?.kind === "probe-failed" && r.stderr, "front app probe failure must carry stderr").toContain("osascript exploded");
		// A failed first probe must not go on to query iTerm.
		expect(applescript).not.toHaveBeenCalled();
	});

	it("iTerm tty failure must classify as probe-failed", async () => {
		scenarios[1].prime();
		const r = await detailed("/opt/tmux");
		expect(r?.kind, "iTerm tty failure must classify as probe-failed").toBe("probe-failed");
		expect(r?.kind === "probe-failed" && r.step, "iTerm tty failure must name its step").toBe("iterm-tty");
	});

	it("list-clients failure must classify as probe-failed", async () => {
		scenarios[2].prime();
		const r = await detailed("/opt/tmux");
		expect(r?.kind, "list-clients failure must classify as probe-failed").toBe("probe-failed");
		expect(r?.kind === "probe-failed" && r.step, "list-clients failure must name its step").toBe("list-clients");
		expect(r?.kind === "probe-failed" && r.stderr, "list-clients failure must carry stderr").toContain("no server running");
	});

	it("non-iTerm front app must classify as not-frontmost", async () => {
		scenarios[3].prime();
		const r = await detailed("/opt/tmux");
		expect(r?.kind, "non-iTerm front app must classify as not-frontmost").toBe("not-frontmost");
		expect(applescript, "not-frontmost must not query iTerm").not.toHaveBeenCalled();
	});

	it("an iTerm pane that is not a tmux client must classify as no-client", async () => {
		scenarios[4].prime();
		const r = await detailed("/opt/tmux");
		expect(r?.kind, "non-tmux iTerm pane must classify as no-client").toBe("no-client");
	});

	it("a resolved client must classify as front with its session and tty", async () => {
		primeProbe("/dev/ttys007", "dev");
		const r = await detailed("/opt/tmux");
		expect(r?.kind, "resolved client must classify as front").toBe("front");
		expect(r?.kind === "front" && r.front, "resolved client must carry session and tty").toEqual({
			session: "dev",
			tty: "/dev/ttys007",
		});
	});

	it("a classified result is cached like a resolved one", async () => {
		scenarios[0].prime();
		const a = await detailed("/opt/tmux");
		const b = await detailed("/opt/tmux");
		expect(a?.kind, "classified result must be cached: first call must classify").toBe("probe-failed");
		expect(b, "classified result must be cached: second call must match the first").toEqual(a);
		expect(jxa, "classified result must be cached: one probe for two calls").toHaveBeenCalledTimes(1);
	});

	it("resolveFrontTmux still returns null for every non-front classification", async () => {
		for (const sc of scenarios) {
			invalidateFrontTmux();
			vi.clearAllMocks();
			sc.prime();
			const r = await detailed("/opt/tmux");
			// The classifier must exist and agree with the scenario before the wrapper means anything.
			expect(r?.kind, `wrapper contract (${sc.name}): detailed result must classify as ${sc.kind}`).toBe(sc.kind);
			invalidateFrontTmux();
			sc.prime();
			expect(await resolveFrontTmux("/opt/tmux"), `wrapper contract (${sc.name}): resolveFrontTmux must return null`).toBeNull();
		}
	});
});
