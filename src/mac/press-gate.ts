/**
 * Long-press detection for Keypad actions, factored out of Window Ring's
 * proven pattern: the hold callback fires AT the threshold (immediate haptic
 * of "something happened", no waiting for release), and a release before the
 * threshold is reported as a short press for the caller to act on in onKeyUp.
 * Pure timers, no SDK — unit-tested with fake timers.
 */

/** Press held this long (ms) registers as a long press. */
export const LONG_PRESS_MS = 500;

export class PressGate {
	private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

	constructor(private readonly holdMs: number = LONG_PRESS_MS) {}

	/** Key went down: arm the hold callback. A second down re-arms. */
	down(id: string, onHold: () => void): void {
		this.cancel(id);
		const t = setTimeout(() => {
			this.timers.delete(id);
			onHold();
		}, this.holdMs);
		this.timers.set(id, t);
	}

	/**
	 * Key came up. Returns true for a short press (released before the
	 * threshold — the caller should run the normal action); false when the
	 * hold callback already fired or nothing was armed.
	 */
	up(id: string): boolean {
		const t = this.timers.get(id);
		if (t === undefined) return false;
		clearTimeout(t);
		this.timers.delete(id);
		return true;
	}

	/** Disarm without firing (e.g. the key disappeared mid-press). */
	cancel(id: string): void {
		const t = this.timers.get(id);
		if (t !== undefined) clearTimeout(t);
		this.timers.delete(id);
	}
}
