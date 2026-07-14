import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newestTranscriptAgeMs } from "../src/mac/claude-transcript.js";
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
