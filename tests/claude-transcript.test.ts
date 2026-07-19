import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { invalidateTranscriptMemo, newestTranscriptAgeMs, newestTranscriptState, transcriptOwesResponse } from "../src/mac/claude-transcript.js";
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

describe("transcriptOwesResponse", () => {
	const use = (id: string) =>
		JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Bash" }] } });
	const result = (id: string) =>
		JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id }] } });
	const assistantText = JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "done" }] } });
	const userPrompt = JSON.stringify({ type: "user", message: { content: "please do X" } });
	const noise = JSON.stringify({ type: "bridge-session" });

	it("BREWING: ends on a tool_result (user turn) — Claude owes the next turn (the reported bug)", () => {
		expect(transcriptOwesResponse([use("A"), result("A"), noise, noise])).toBe(true);
	});
	it("BREWING: ends on a fresh user prompt — awaiting Claude's response", () => {
		expect(transcriptOwesResponse([assistantText, userPrompt, noise])).toBe(true);
	});
	it("tool running: unanswered tool_use = working", () => {
		expect(transcriptOwesResponse([use("A"), noise])).toBe(true);
	});
	it("IDLE: ends on a completed assistant turn (text, all tools answered)", () => {
		expect(transcriptOwesResponse([use("A"), result("A"), assistantText, noise])).toBe(false);
	});
	it("F004: an OLD unanswered-looking tool from a prior turn does not override a later completed turn", () => {
		// use(A) then a later user prompt then a completed assistant turn: A is
		// before the last user, so it is not the current turn's pending tool.
		expect(transcriptOwesResponse([use("A"), userPrompt, assistantText])).toBe(false);
	});
	it("pending tool in the CURRENT turn (after the last user) still works", () => {
		expect(transcriptOwesResponse([userPrompt, use("B")])).toBe(true);
	});
	it("meta entries after the last turn do not flip the verdict", () => {
		expect(transcriptOwesResponse([assistantText, noise, noise, noise])).toBe(false);
	});
	it("garbage / partial lines at the window edge are skipped", () => {
		expect(transcriptOwesResponse(['{"type":"user" truncated', assistantText])).toBe(false);
	});
	it("empty tail = not owing (let freshness/title decide)", () => {
		expect(transcriptOwesResponse([])).toBe(false);
	});
});

describe("newestTranscriptState", () => {
	it("reports age and working together from real files (Brewing: dangling tool_result)", async () => {
		const base = await makeBase();
		const lines = [
			JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "X", name: "Read" }] } }),
			JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "X" }] } }),
			JSON.stringify({ type: "bridge-session" }),
		].join("\n");
		const p = join(base, projectSlug(PROJECT), "s.jsonl");
		await writeFile(p, lines + "\n");
		const t = new Date(Date.now() - 120_000);
		await utimes(p, t, t);
		const state = await newestTranscriptState(PROJECT, Date.now(), base);
		expect(state.working).toBe(true); // stale mtime, all tools answered, but owes the next turn
		expect(state.ageMs!).toBeGreaterThan(60_000);
	});
});

describe("newestTranscriptState memo (F006)", () => {
	it("re-parses when the transcript mtime advances (verdict tracks content)", async () => {
		invalidateTranscriptMemo();
		const base = await makeBase();
		const p = join(base, projectSlug(PROJECT), "s.jsonl");
		await writeFile(p, JSON.stringify({ type: "user", message: { content: "x" } }) + "\n");
		const old = new Date(Date.now() - 10_000);
		await utimes(p, old, old);
		expect((await newestTranscriptState(PROJECT, Date.now(), base)).working).toBe(true); // owes
		// Claude answered — new content, newer mtime -> memo invalidated by mtime.
		await writeFile(p, JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "done" }] } }) + "\n");
		expect((await newestTranscriptState(PROJECT, Date.now(), base)).working).toBe(false); // idle
	});
});
