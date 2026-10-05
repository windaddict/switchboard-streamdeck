import streamDeck from "@elgato/streamdeck";

import { applyReport, type DialReport } from "../mac/dial-outcome.js";

/**
 * Thin SDK glue for a failed dial gesture: logs the report and flashes the
 * dial's alert, as decided by the pure `dial-outcome.ts`. Every dial shell
 * calls this instead of logging on its own, so a failure is both visible on
 * the deck and recorded once in the log.
 */
export function reportDial(action: { showAlert(): Promise<void> }, report: DialReport): Promise<void> {
	return applyReport(report, {
		warn: (m) => streamDeck.logger.warn(m),
		error: (m) => streamDeck.logger.error(m),
		alert: () => action.showAlert(),
	});
}
