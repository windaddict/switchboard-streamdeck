#!/usr/bin/env bash
# Notarize the native helpers so macOS Gatekeeper allows them after download.
# The helpers are bare CLI executables (not an app bundle), so they cannot be
# stapled — notarization registers their hashes with Apple and Gatekeeper
# verifies them online on first run.
#
# Prerequisites (one-time):
#   1. A "Developer ID Application" certificate in your keychain. `npm run
#      build:helper` then signs the helpers with it automatically.
#   2. A notarytool keychain profile. Create it once with an app-specific
#      password from appleid.apple.com:
#        xcrun notarytool store-credentials switchboard-notary \
#          --apple-id "<your-apple-id>" \
#          --team-id 9CHGJ6ZAE6 \
#          --password "<app-specific-password>"
#
# Usage:  ./scripts/notarize-helpers.sh    (override profile via NOTARY_PROFILE)
set -euo pipefail

PROFILE="${NOTARY_PROFILE:-switchboard-notary}"
OUT="com.movingavg.switchboard.sdPlugin/bin/macos"
TMP="$(mktemp -d)"
ZIP="$TMP/switchboard-helpers.zip"

# Verify the helpers are Developer ID signed before wasting a submission.
for b in scroll tile axcheck; do
	if ! codesign -dv "$OUT/$b" 2>&1 | grep -q "Authority=Developer ID Application"; then
		echo "error: $OUT/$b is not Developer ID signed. Install the cert and re-run 'npm run build:helper'." >&2
		exit 1
	fi
done

ditto -c -k "$OUT" "$ZIP"
echo "Submitting $(basename "$ZIP") to Apple notary service (profile: $PROFILE)…"
xcrun notarytool submit "$ZIP" --keychain-profile "$PROFILE" --wait
echo "Done. Bare CLI binaries cannot be stapled; Gatekeeper verifies them online on first run."
