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

build() {
	local name="$1" src="$2"
	swiftc -O -target arm64-apple-macos12 -o "$TMP/$name.arm64" "$src"
	swiftc -O -target x86_64-apple-macos12 -o "$TMP/$name.x86_64" "$src"
	lipo -create "$TMP/$name.arm64" "$TMP/$name.x86_64" -o "$OUT/$name"
	echo "$name: $(lipo -archs "$OUT/$name")"
}

build scroll helper/scroll.swift
build tile helper/tile.swift
