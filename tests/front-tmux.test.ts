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

import { invalidateFrontTmux, resolveFrontTmux } from "../src/mac/front-tmux.js";

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
