/**
 * Per-key async mutex: chains tasks for the same key so read-modify-write
 * handlers (dial rotations that persist a cursor, run a subprocess, then
 * render) can't interleave. Stream Deck delivers events serially, but async
 * handlers overlap at their await points — two rotations could both read the
 * same settings index and both write index+1. Tasks for DIFFERENT keys run
 * concurrently; a rejected task never breaks the chain.
 *
 * The map is self-cleaning: when a key's chain fully settles it removes its
 * own entry (only if it is still the tail). There is deliberately no external
 * "release" — deleting a live chain would let a new event run concurrently
 * with an in-flight task, recreating the exact race this exists to prevent.
 */

const chains = new Map<string, Promise<unknown>>();

export function serialize<T>(key: string, task: () => Promise<T>): Promise<T> {
	const prev = chains.get(key) ?? Promise.resolve();
	const next = prev.then(task, task);
	let entry: Promise<void>;
	entry = next.then(
		() => {
			if (chains.get(key) === entry) chains.delete(key);
		},
		() => {
			if (chains.get(key) === entry) chains.delete(key);
		},
	);
	chains.set(key, entry);
	return next;
}
