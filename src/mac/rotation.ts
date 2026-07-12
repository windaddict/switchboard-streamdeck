/** Shared dial-rotation direction mapping. */

export type RotationDirection = "next" | "prev" | "none";

/** Map a dial rotation to a step: positive = next, negative = prev, 0 = none. */
export function rotationDirection(ticks: number): RotationDirection {
	const t = Math.trunc(ticks);
	if (t > 0) return "next";
	if (t < 0) return "prev";
	return "none";
}

/** A rotation as direction + how many detents to apply. Fast spins arrive as
 * one event with |ticks| > 1; collapsing them to a single step loses motion.
 * Steps are capped so a wild spin can't queue a subprocess storm. */
export function rotationSteps(ticks: number): { direction: RotationDirection; steps: number } {
	const t = Math.trunc(ticks);
	return { direction: rotationDirection(t), steps: Math.min(Math.abs(t), 5) };
}
