// Reports whether this process has macOS Accessibility (AX) trust, with no side
// effects and no permission prompt. Built to `bin/macos/axcheck`; see
// `npm run build:helper`. Used by the property inspector to show a live
// "Accessibility not granted" warning instead of failing silently when a key
// is pressed.
//
// Prints "trusted" or "untrusted" to stdout and exits 0. AXIsProcessTrusted()
// is the non-prompting query (the prompting variant is
// AXIsProcessTrustedWithOptions with kAXTrustedCheckOptionPrompt = true).

import ApplicationServices
import Foundation

print(AXIsProcessTrusted() ? "trusted" : "untrusted")
