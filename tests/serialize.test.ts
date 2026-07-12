import { describe, expect, it } from "vitest";
import { serialize } from "../src/mac/serialize.js";

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
