---
description: Cut a signed, notarized Switchboard release (GitHub + Homebrew tap)
---

Cut a new Switchboard release end to end. Default the version to the next patch
of the current `package.json` version unless the user specifies one in `$ARGUMENTS`
(e.g. `/release 1.2.0`). Work from `~/code/switchboard`.

Follow these steps **in order**. Stop and report if any check fails.

## 0. Preflight
- `git status` is clean and on `main`; `git pull --rebase`.
- `npm run typecheck && npm test && npm run build` all pass (`streamdeck validate`
  runs in `build`).
- Decide the version `X.Y.Z`.

## 1. Helpers: only if a `helper/*.swift` changed since the last release
- If unchanged: **do nothing here** — the committed `bin/macos/*` are already
  Developer ID signed + notarized; reuse them as-is.
- If changed: `bundle exec fastlane mac notarize_helpers` (signs + notarizes via
  the App Store Connect API key, Team `9CHGJ6ZAE6`). Requires the one-time
  Account-Holder Developer ID cert (Xcode → Settings → Accounts → Manage
  Certificates → + → Developer ID Application). Then **commit** the freshly signed
  `bin/macos/{scroll,tile,axcheck}` — those exact bytes are what Apple notarized.

## 2. Version bump + docs
- Set `package.json` `version` to `X.Y.Z`.
- Set the manifest `Version` to `X.Y.Z.0` (`com.movingavg.switchboard.sdPlugin/manifest.json`)
  — this is the version the Stream Deck app displays. It drifted before (manifest
  said 1.2.0.0 while v1.1.0/v1.1.1 shipped); keep the two in lockstep.
- Update `README.md`: action count and test count if they changed.
- Run `python3 scripts/make-hero.py` if actions were added/renamed; commit the hero.
- Commit (`release: prep vX.Y.Z …`) and `git push origin main`.

## 3. Pack the artifacts
- `npm run build` — rebuilds ONLY `bin/plugin.js`. **Never run `npm run build:helper`
  here** (re-signing changes helper hashes and breaks notarization).
- `npm run pack && npm run pack:zip` → `dist/com.movingavg.switchboard.streamDeckPlugin`
  and `dist/com.movingavg.switchboard.sdPlugin.zip`.
- `shasum -a 256 dist/com.movingavg.switchboard.sdPlugin.zip` — note the hash.

## 4. Homebrew cask (TWO files, both repos)
Set `version "X.Y.Z"` and the new `sha256` in:
- `packaging/homebrew/switchboard.rb` (this repo) — commit + `git push origin main`.
- `~/code/homebrew-switchboard/Casks/switchboard.rb` (the separate tap repo) —
  commit (`switchboard X.Y.Z`) + `git push origin main`.

## 5. GitHub release
```
gh release create vX.Y.Z \
  dist/com.movingavg.switchboard.streamDeckPlugin \
  dist/com.movingavg.switchboard.sdPlugin.zip \
  --repo windaddict/switchboard-streamdeck \
  --title "Switchboard vX.Y.Z" --notes "<highlights>"
```

## 6. Verify
- `brew update && brew fetch --cask windaddict/switchboard/switchboard` →
  must print `✔︎ Cask switchboard (X.Y.Z)` (proves the release URL + sha match).
- `gh release view vX.Y.Z --repo windaddict/switchboard-streamdeck --json assets`
  shows both artifacts.

Report the release URL and the verification results.
