/**
 * Pure logic for the BBEdit document dial: move back and forth between the
 * documents open in BBEdit's front text window. BBEdit exposes `documents` and
 * a read-only `active document` per text window; the `select` command makes a
 * document active. Scripts take no user input, so there is nothing to escape.
 */

import type { RotationDirection } from "./rotation.js";

/** AppleScript returning the front text window's active document name (or ""). */
export const BBEDIT_CURRENT_DOC_SCRIPT = `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	return name of active document of text window 1
end tell`;

/**
 * AppleScript that moves to the next/previous document in BBEdit's front text
 * window (wrapping) and returns the newly active document's name.
 */
export function bbeditCycleDocScript(direction: Exclude<RotationDirection, "none">): string {
	const delta = direction === "next" ? "1" : "-1";
	return `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	set w to text window 1
	set docs to documents of w
	set n to count of docs
	if n is 0 then return ""
	set adoc to active document of w
	set idx to 1
	repeat with i from 1 to n
		if (item i of docs) is adoc then
			set idx to i
			exit repeat
		end if
	end repeat
	set t to idx + (${delta})
	if t < 1 then set t to n
	if t > n then set t to 1
	select (item t of docs)
	return name of active document of w
end tell`;
}
