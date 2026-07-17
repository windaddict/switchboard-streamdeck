import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newestTranscriptAgeMs, newestTranscriptState, pendingToolUseInTail } from "../src/mac/claude-transcript.js";
import { projectSlug } from "../src/mac/claude-project.js";

const PROJECT = "/Users/j/code/app";

async function makeBase(): Promise<string> {
	const base = await mkdtemp(join(tmpdir(), "sb-transcripts-"));
	await mkdir(join(base, projectSlug(PROJECT)), { recursive: true });
	return base;
}

async function addTranscript(base: string, name: string, ageMs: number): Promise<void> {
	const p = join(base, projectSlug(PROJECT), name);
	await writeFile(p, "{}\n");
	const t = new Date(Date.now() - ageMs);
	await utimes(p, t, t);
}

describe("newestTranscriptAgeMs", () => {
	it("returns the NEWEST transcript's age", async () => {
		const base = await makeBase();
		await addTranscript(base, "old.jsonl", 600_000);
		await addTranscript(base, "fresh.jsonl", 5_000);
		const age = await newestTranscriptAgeMs(PROJECT, Date.now(), base);
		expect(age).not.toBeNull();
		expect(age!).toBeGreaterThanOrEqual(4_000);
		expect(age!).toBeLessThan(30_000);
	});
	it("ignores non-jsonl files", async () => {
		const base = await makeBase();
		await addTranscript(base, "notes.txt", 1_000);
		expect(await newestTranscriptAgeMs(PROJECT, Date.now(), base)).toBeNull();
	});
	it("null when the project has no transcript dir", async () => {
		const base = await makeBase();
		expect(await newestTranscriptAgeMs("/absent/project", Date.now(), base)).toBeNull();
	});
});

describe("pendingToolUseInTail", () => {
	const use = (id: string) =>
		JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Bash" }] } });
	const result = (id: string) =>
		JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id }] } });
	const noise = JSON.stringify({ type: "bridge-session" });

	it("unanswered tool_use = pending, even with noise entries after it (real transcript shape)", () => {
		expect(pendingToolUseInTail([use("A"), noise, noise])).toBe(true);
	});
	it("answered pair = not pending", () => {
		expect(pendingToolUseInTail([use("A"), result("A"), noise])).toBe(false);
	});
	it("one answered, one in flight = pending", () => {
		expect(pendingToolUseInTail([use("A"), result("A"), use("B"), noise])).toBe(true);
	});
	it("garbage / partial lines at the window edge are skipped", () => {
		expect(pendingToolUseInTail(['{"truncated', use("A"), result("A")])).toBe(false);
	});
	it("empty tail = not pending", () => {
		expect(pendingToolUseInTail([])).toBe(false);
	});
});

describe("newestTranscriptState", () => {
	it("reports age and pending together from real files", async () => {
		const base = await makeBase();
		const line = JSON.stringify({
			type: "assistant",
			message: { content: [{ type: "tool_use", id: "X", name: "Bash" }] },
		});
		const p = join(base, projectSlug(PROJECT), "s.jsonl");
		await writeFile(p, line + "\n" + JSON.stringify({ type: "bridge-session" }) + "\n");
		const t = new Date(Date.now() - 120_000);
		await utimes(p, t, t);
		const state = await newestTranscriptState(PROJECT, Date.now(), base);
		expect(state.pendingToolUse).toBe(true); // stale mtime but tool in flight
		expect(state.ageMs!).toBeGreaterThan(60_000);
	});
});
