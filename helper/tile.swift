// Moves + resizes the focused window to a normalized rectangle of its screen's
// *visible* frame (Dock- and menu-bar-aware, correct across multiple displays),
// using the Accessibility API. Built to `bin/macos/tile`; see
// `npm run build:helper`.
//
// Usage: tile <x> <y> <w> <h>
//   All four are fractions 0..1 of the visible frame. y is measured from the
//   TOP, so `tile 0 0 0.5 0.5` puts the window in the top-left quadrant and
//   `tile 0 0 1 1` maximizes it within the visible frame.
//
// Exits 0 always. Prints "untrusted" to stderr when the process lacks
// Accessibility (window edits are silently dropped by macOS in that case) so
// the plugin can guide the user instead of failing in silence.

import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

func fail(_ msg: String) -> Never {
	FileHandle.standardError.write(Data((msg + "\n").utf8))
	print("ok")
	exit(0)
}

let args = CommandLine.arguments.dropFirst().compactMap { Double($0) }
guard args.count == 4 else { fail("usage: tile x y w h") }
let (fx, fy, fw, fh) = (args[0], args[1], args[2], args[3])

guard AXIsProcessTrusted() else { fail("untrusted") }

// The focused window of the frontmost application.
guard let app = NSWorkspace.shared.frontmostApplication else { fail("no-frontmost") }
let axApp = AXUIElementCreateApplication(app.processIdentifier)

var winRef: CFTypeRef?
guard
	AXUIElementCopyAttributeValue(axApp, kAXFocusedWindowAttribute as CFString, &winRef)
		== .success,
	let window = winRef
else { fail("no-window") }
let axWindow = window as! AXUIElement

// Read the window's current top-left position (global, y-down) so we can find
// which screen it lives on.
func axPoint(_ attr: String) -> CGPoint? {
	var ref: CFTypeRef?
	guard AXUIElementCopyAttributeValue(axWindow, attr as CFString, &ref) == .success,
		let v = ref
	else { return nil }
	var pt = CGPoint.zero
	AXValueGetValue(v as! AXValue, .cgPoint, &pt)
	return pt
}
func axSize(_ attr: String) -> CGSize? {
	var ref: CFTypeRef?
	guard AXUIElementCopyAttributeValue(axWindow, attr as CFString, &ref) == .success,
		let v = ref
	else { return nil }
	var sz = CGSize.zero
	AXValueGetValue(v as! AXValue, .cgSize, &sz)
	return sz
}

let curPos = axPoint(kAXPositionAttribute as String) ?? .zero
let curSize = axSize(kAXSizeAttribute as String) ?? CGSize(width: 1, height: 1)

// Primary-display height is the bridge between AX/Quartz (top-left origin,
// y-down) and Cocoa/NSScreen (bottom-left origin, y-up).
guard let primary = NSScreen.screens.first else { fail("no-screen") }
let primaryHeight = primary.frame.height

// The window's center in AX/global (top-left) coords.
let centerTopLeft = CGPoint(
	x: curPos.x + curSize.width / 2,
	y: curPos.y + curSize.height / 2)
// Convert to Cocoa (bottom-left) to test against NSScreen frames.
let centerCocoa = CGPoint(x: centerTopLeft.x, y: primaryHeight - centerTopLeft.y)

// Pick the screen containing the window center, else the primary.
let screen =
	NSScreen.screens.first { NSPointInRect(centerCocoa, $0.frame) }
	?? primary
let vf = screen.visibleFrame // Cocoa, bottom-left, excludes Dock + menu bar

// Target rectangle inside the visible frame.
let targetW = fw * vf.size.width
let targetH = fh * vf.size.height
let targetLeft = vf.origin.x + fx * vf.size.width
// Top edge of the visible frame in Cocoa coords, then move down by fy.
let visibleTopCocoa = vf.origin.y + vf.size.height
let windowTopCocoa = visibleTopCocoa - fy * vf.size.height
// Convert the top edge to AX/global (top-left) y.
let axX = targetLeft
let axY = primaryHeight - windowTopCocoa

// Apply. Set size before and after position so apps that clamp on one axis
// still settle correctly; AX silently ignores edits on fixed-size windows.
var pos = CGPoint(x: axX.rounded(), y: axY.rounded())
var size = CGSize(width: targetW.rounded(), height: targetH.rounded())
if let posVal = AXValueCreate(.cgPoint, &pos) {
	AXUIElementSetAttributeValue(axWindow, kAXPositionAttribute as CFString, posVal)
}
if let sizeVal = AXValueCreate(.cgSize, &size) {
	AXUIElementSetAttributeValue(axWindow, kAXSizeAttribute as CFString, sizeVal)
}
if let posVal = AXValueCreate(.cgPoint, &pos) {
	AXUIElementSetAttributeValue(axWindow, kAXPositionAttribute as CFString, posVal)
}

print("ok")
