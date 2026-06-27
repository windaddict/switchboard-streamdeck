/** Shared dial-rotation direction mapping. */

export type RotationDirection = "next" | "prev" | "none";

/** Map a dial rotation to a step: positive = next, negative = prev, 0 = none. */
export function rotationDirection(ticks: number): RotationDirection {
	const t = Math.trunc(ticks);
	if (t > 0) return "next";
	if (t < 0) return "prev";
	return "none";
}
