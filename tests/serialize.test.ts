import { beforeEach, describe, expect, it } from "vitest";
import { MAX_HOLD_MS, resetExclusive, runExclusive, serialize } from "../src/mac/serialize.js";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("serialize", () => {
	it("runs same-key tasks strictly in order, even when they overlap", async () => {
		const order: number[] = [];
		const a = serialize("k", async () => {
			await tick();
			order.push(1);
		});
		const b = serialize("k", async () => {
			order.push(2);
		});
		await Promise.all([a, b]);
		expect(order).toEqual([1, 2]);
	});

	it("keeps different keys concurrent", async () => {
		const order: string[] = [];
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const slow = serialize("a", async () => {
			await gate;
			order.push("slow");
		});
		const fast = serialize("b", async () => {
			order.push("fast");
		});
		await fast;
		expect(order).toEqual(["fast"]); // "b" did not wait for "a"
		release();
		await slow;
	});

	it("a rejected task does not break the chain for the next one", async () => {
		await expect(serialize("k2", async () => Promise.reject(new Error("boom")))).rejects.toThrow(
			"boom",
		);
		await expect(serialize("k2", async () => "ok")).resolves.toBe("ok");
	});

	it("returns the task's value", async () => {
		await expect(serialize("k3", async () => 42)).resolves.toBe(42);
	});

	it("re-serializes after the chain settles (self-cleaned map still works)", async () => {
		await serialize("k4", async () => 1);
		await new Promise((r) => setTimeout(r, 0)); // let self-cleanup run
		const order: number[] = [];
		await Promise.all([
			serialize("k4", async () => {
				await new Promise((r) => setTimeout(r, 0));
				order.push(1);
			}),
			serialize("k4", async () => {
				order.push(2);
			}),
		]);
		expect(order).toEqual([1, 2]);
	});
});

describe("runExclusive", () => {
	beforeEach(() => resetExclusive());

	it("drops a stale overlapping request and accepts a later one", async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		const first = runExclusive("focus", async () => { await gate; return "first"; });
		const dropped = await runExclusive("focus", async () => "stale");
		expect(dropped.ran).toBe(false);
		release();
		await expect(first).resolves.toEqual({ ran: true, value: "first" });
		await expect(runExclusive("focus", async () => "next")).resolves.toEqual({ ran: true, value: "next" });
	});

	it("releases the key after a rejection", async () => {
		await expect(runExclusive("focus-error", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
		await expect(runExclusive("focus-error", async () => "recovered")).resolves.toEqual({ ran: true, value: "recovered" });
	});

	/** A dropped press must be REPORTABLE, with the real elapsed hold — it used
	 * to return `undefined`, which a void handler could not tell from success. */
	it("reports the exact hold age when it drops a press, and does not run the task", async () => {
		let clock = 1000;
		const now = () => clock;
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		const first = runExclusive("held", async () => { await gate; return "first"; }, { now });
		clock += 250;
		let ran = 0;
		const dropped = await runExclusive("held", async () => { ran += 1; return "stale"; }, { now });
		expect(dropped).toEqual({ ran: false, heldForMs: 250 });
		expect(ran).toBe(0); // the dropped task must never execute
		release();
		await first;
	});

	/** THE DEFECT. The SDK round-trips inside the lock are unbounded, so a lost
	 * reply left a holder pending forever — and "iterm-focus" is shared by all
	 * five focus actions, so that killed every one of them until a restart. */
	it("lets a later request take a key whose holder never settles", async () => {
		let clock = 1000;
		const now = () => clock;
		let ran = 0;
		void runExclusive("wedged", () => new Promise<string>(() => {}), { now }); // never settles
		await tick();

		// One millisecond BELOW the threshold the claim still stands: this is a
		// recovery policy, not a timeout on legitimate work.
		clock += MAX_HOLD_MS - 1;
		expect((await runExclusive("wedged", async () => { ran += 1; return "early"; }, { now })).ran).toBe(false);
		expect(ran).toBe(0);

		// EXACTLY at the threshold it becomes takeable — the guard is
		// `heldForMs < MAX_HOLD_MS`, so equality takes. Pinned so neither the
		// constant nor the comparison can drift without this failing.
		clock += 1;
		const recovered = await runExclusive("wedged", async () => "recovered", { now });
		expect(recovered).toEqual({ ran: true, value: "recovered", stoleAfterMs: MAX_HOLD_MS });
	});

	/** Takeover must be announced AS IT HAPPENS. The outcome cannot carry it in
	 * time: a replacement that also wedges never returns, so a caller waiting for
	 * the outcome would never learn the deck had been dead. */
	it("announces a takeover before the replacement runs, even if it never finishes", async () => {
		let clock = 1000;
		const now = () => clock;
		const steals: number[] = [];
		void runExclusive("announce", () => new Promise<void>(() => {}), { now });
		await tick();
		clock += MAX_HOLD_MS + 5;
		void runExclusive("announce", () => new Promise<void>(() => {}), {
			now,
			onSteal: (ms) => steals.push(ms),
		});
		await tick();
		expect(steals).toEqual([MAX_HOLD_MS + 5]); // reported despite the replacement wedging too
	});

	it("does not announce a takeover on an uncontended acquire", async () => {
		const steals: number[] = [];
		await runExclusive("quiet", async () => "v", { onSteal: (ms) => steals.push(ms) });
		expect(steals).toEqual([]);
	});

	/** The displaced holder is not cancelled and may settle at any later moment.
	 * When it does it must not delete the entry belonging to whoever took the key
	 * from it — otherwise the key is released twice and two presses can run. */
	it("a displaced holder settling later does not release the key it lost", async () => {
		let clock = 1000;
		const now = () => clock;
		let releaseDisplaced!: () => void;
		const displaced = new Promise<void>((resolve) => (releaseDisplaced = resolve));
		void runExclusive("lost", async () => { await displaced; }, { now });
		await tick();

		clock += MAX_HOLD_MS + 1;
		let releaseSecond!: () => void;
		const second = new Promise<void>((resolve) => (releaseSecond = resolve));
		const taker = runExclusive("lost", async () => { await second; return "taker"; }, { now });
		await tick();

		releaseDisplaced();      // the original finally-block runs now
		await tick();

		expect((await runExclusive("lost", async () => "third", { now })).ran).toBe(false);
		releaseSecond();
		await expect(taker).resolves.toMatchObject({ ran: true, value: "taker" });
	});

	/** Three generations settling out of order: only the newest may clean up. */
	it("survives three generations whose holders settle out of order", async () => {
		let clock = 1000;
		const now = () => clock;
		const releases: Array<() => void> = [];
		const start = (name: string) => {
			let release!: () => void;
			const gate = new Promise<void>((r) => (release = r));
			releases.push(release);
			return runExclusive("gen", async () => { await gate; return name; }, { now });
		};
		const first = start("first");
		await tick();
		clock += MAX_HOLD_MS + 1;
		const second = start("second");
		await tick();
		clock += MAX_HOLD_MS + 1;
		const third = start("third");
		await tick();

		releases[0](); releases[1](); // the two displaced holders settle first
		await tick();
		// The third still owns the key.
		expect((await runExclusive("gen", async () => "x", { now })).ran).toBe(false);
		releases[2]();
		await Promise.all([first, second, third]);
		// Once the owner settles the key is free again.
		expect((await runExclusive("gen", async () => "free", { now })).ran).toBe(true);
	});

	/** Same-millisecond requests: the map is updated synchronously, so the second
	 * sees the first's claim even though no time has passed. */
	it("serialises two requests that arrive in the same millisecond", async () => {
		const now = () => 5000;
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const a = runExclusive("same-ms", async () => { await gate; return "a"; }, { now });
		const b = await runExclusive("same-ms", async () => "b", { now });
		expect(b).toEqual({ ran: false, heldForMs: 0 });
		release();
		await a;
	});
});
