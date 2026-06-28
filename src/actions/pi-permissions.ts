/**
 * Shared property-inspector handler for the live Accessibility warning. Actions
 * that need Accessibility call this from their `onSendToPlugin`; it answers the
 * PI's `checkAccessibility` request and pushes the result back so the PI can
 * show or hide its warning banner. Returns true when it handled the message, so
 * an action with its own datasource handling can early-return.
 */

import streamDeck from "@elgato/streamdeck";

import { checkAccessibility } from "../mac/permissions.js";

export async function respondToAccessibilityCheck(
	payload: unknown,
	baseUrl: string,
): Promise<boolean> {
	const event = (payload as { event?: string } | undefined)?.event;
	if (event !== "checkAccessibility") return false;

	const trusted = await checkAccessibility(baseUrl);
	await streamDeck.ui.current?.sendToPropertyInspector({ event: "checkAccessibility", trusted });
	return true;
}
