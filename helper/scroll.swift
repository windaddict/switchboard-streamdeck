// Posts a single proportional scroll-wheel event, so a dial detent scrolls by a
// precise number of lines in one atomic event — no synthetic-keystroke spam and
// no event coalescing. Built to `bin/macos/scroll`; see `npm run build:helper`.
//
// Usage: scroll <signedLineCount>
//   positive = scroll DOWN, negative = scroll UP.
//
// Exits 0 always. Prints "untrusted" to stderr when the process lacks
// Accessibility (events are silently dropped by macOS in that case) so the
// plugin can guide the user instead of failing in silence.

import ApplicationServices
import CoreGraphics
import Foundation

let lines = Int32(CommandLine.arguments.dropFirst().first ?? "0") ?? 0
let trusted = AXIsProcessTrusted()

// CGScrollWheel: positive wheel1 scrolls up, so negate to make positive = down.
if lines != 0,
	let event = CGEvent(
		scrollWheelEvent2Source: nil,
		units: .line,
		wheelCount: 1,
		wheel1: -lines,
		wheel2: 0,
		wheel3: 0)
{
	event.post(tap: .cghidEventTap)
}

if !trusted {
	FileHandle.standardError.write(Data("untrusted\n".utf8))
}
print("ok")
