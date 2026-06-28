#!/usr/bin/env bash
# Build the native Swift helpers as UNIVERSAL (arm64 + x86_64) binaries so the
# plugin runs on both Apple Silicon and Intel Macs. A single-arch helper fails
# silently on the other architecture (the action's command can't exec), which
# looks like "the key does nothing" — see the Scroll Window / Arrange Window
# actions, the only ones that shell out to a native helper.
set -euo pipefail

OUT="com.movingavg.switchboard.sdPlugin/bin/macos"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

# Sign with a Developer ID Application cert when one is in the keychain (needed
# for distribution + notarization, so downloaded helpers aren't Gatekeeper-
# blocked). Falls back to the default ad-hoc linker signature for dev builds.
SIGN_ID="$(security find-identity -v -p codesigning 2>/dev/null \
	| awk -F'"' '/Developer ID Application/{print $2; exit}')"

build() {
	local name="$1" src="$2"
	swiftc -O -target arm64-apple-macos12 -o "$TMP/$name.arm64" "$src"
	swiftc -O -target x86_64-apple-macos12 -o "$TMP/$name.x86_64" "$src"
	lipo -create "$TMP/$name.arm64" "$TMP/$name.x86_64" -o "$OUT/$name"
	if [ -n "$SIGN_ID" ]; then
		codesign --force --options runtime --timestamp --sign "$SIGN_ID" "$OUT/$name"
		echo "$name: $(lipo -archs "$OUT/$name") — signed ($SIGN_ID)"
	else
		echo "$name: $(lipo -archs "$OUT/$name") — ad-hoc (no Developer ID cert in keychain)"
	fi
}

build scroll helper/scroll.swift
build tile helper/tile.swift
build axcheck helper/axcheck.swift
