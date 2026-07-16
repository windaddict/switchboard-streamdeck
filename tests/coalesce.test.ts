import { describe, expect, it } from "vitest";
import { CoalescedRunner } from "../src/mac/coalesce.js";

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => (resolve = r));
	return { promise, resolve };
}

describe("CoalescedRunner", () => {
	it("runs the job once for a lone request", async () => {
		let runs = 0;
		const r = new CoalescedRunner(async () => {
			runs++;
		});
		await r.request();
		expect(runs).toBe(1);
	});

	it("a request during a run queues EXACTLY ONE rerun (never dropped, never stacked)", async () => {
		let runs = 0;
		const gates: Array<ReturnType<typeof deferred>> = [deferred(), deferred()];
		const r = new CoalescedRunner(async () => {
			const gate = gates[runs];
			runs++;
			if (gate) await gate.promise;
		});
		const first = r.request();
		// Three explicit requests while run 1 is in flight — the old guard
		// dropped all of them; here they coalesce into one rerun.
		void r.request();
		void r.request();
		void r.request();
		expect(runs).toBe(1);
		gates[0].resolve();
		gates[1].resolve();
		await first;
		await new Promise((res) => setTimeout(res, 0));
		expect(runs).toBe(2);
	});

	it("the queued rerun reads post-change state (runs AFTER the change)", async () => {
		const seen: string[] = [];
		let state = "old";
		const gate = deferred();
		let first = true;
		const r = new CoalescedRunner(async () => {
			if (first) {
				first = false;
				await gate.promise; // in-flight tick straddles the change
			}
			seen.push(state);
		});
		const p = r.request();
		state = "new"; // capture happens mid-tick
		void r.request(); // the post-capture repaint request
		gate.resolve();
		await p;
		await new Promise((res) => setTimeout(res, 0));
		expect(seen).toEqual(["new", "new"]);
	});

	it("a throwing job neither wedges the runner nor kills the queued rerun", async () => {
		let runs = 0;
		const r = new CoalescedRunner(async () => {
			runs++;
			if (runs === 1) throw new Error("boom");
		});
		await r.request();
		expect(runs).toBe(1);
		await r.request();
		expect(runs).toBe(2);
	});
});
