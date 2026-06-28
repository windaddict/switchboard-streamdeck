# Switchboard — TODO

Open items noted during the build/review. Nothing here is a known crash; the
plugin is shippable as-is.

## Bugs / correctness (from the code review)

- [x] **Private-window Safari safety.** Fixed — `buildPrivateScript` now records
      the front doc URL, sends ⌘⇧N, polls until a new window is frontmost, and
      only then sets the URL (so a slow open can't clobber the current tab).
- [ ] **AppleScript newline escaping.** `escapeForAppleScript` (`src/applescript/escape.ts`)
      handles `\` and `"` only; a title pattern containing a newline/tab produces
      an invalid script. Encode or strip them.
- [ ] **Window Ring title drift.** Windows are matched by (app, title); a window
      whose title changes (browser page, edited-doc dot) won't re-match. Options:
      normalize volatile titles, or add a native `CGWindowID` helper for stable
      identity.

## Refactors / cleanup (deferred, deliberate)

- [ ] Extract a `PolledKeyAction` base class for the visible-Map + poll-timer
      scaffold shared by `open-file.ts` and `window-ring.ts` (medium risk — the
      action shells have no direct unit tests).
- [ ] Extract a parameterized permission-message helper (Accessibility vs
      Automation) used by several action shells.
- [ ] Remove dead `FileStatus "plain"` (`src/mac/key-image.ts`); decide whether
      to keep `matchesGlob` (`src/mac/files.ts`, used only by tests).
- [ ] Extract Open File's status-state computation into a pure `fileStatus(...)`
      helper + test.

## Tests

- [ ] Cover `resolveTarget` bare-URL → `derivePattern` path (targets.ts) and
      `titleClause` all-empty pattern (safari/applescript.ts).

## Release / publishing

- [ ] Cut a GitHub release: `npm run build && npm run pack && npm run pack:zip`,
      attach `dist/*.streamDeckPlugin` + `dist/*.sdPlugin.zip`, tag `vX.Y.Z`.
- [ ] Fill `packaging/homebrew/switchboard.rb`: version + sha256 of the zip
      (owner/slug already set to `windaddict/switchboard-streamdeck`); host in a
      `homebrew-switchboard` tap.
- [ ] Set the GitHub repo **About** + **topics** (`stream-deck`, `streamdeck-plugin`,
      `elgato`, `macos`, `tmux`, `iterm2`, `bbedit`, `safari`, `window-manager`,
      `automation`) and a social-preview image.
- [ ] Replace the flagship-essay placeholder link in `README.md` once published.
- [x] Hero showcase image added (`docs/switchboard-hero.png`). A true animated
      demo GIF still needs a real Stream Deck screen recording (optional).

## Security / privacy (from the security review)

- [x] **Commit-author email scrubbed.** History was rewritten so every commit
      carries `4132973+windaddict@users.noreply.github.com`; the repo's local
      `user.email` is set to the same noreply address. Zero occurrences of the
      old personal email remain. No secrets/keys/PII were found in the tree or
      history.
- [ ] **Sign + notarize the native helpers.** They're currently ad-hoc signed,
      so on a Mac that downloaded the release, Gatekeeper can block the helper
      binaries (Scroll/Arrange do nothing). Pipeline is scaffolded:
      `build:helper` auto-signs with a **Developer ID Application** cert when one
      is in the keychain, and `scripts/notarize-helpers.sh` submits to Apple
      (Team `9CHGJ6ZAE6`). **Blocked on:** installing a Developer ID Application
      cert (keychain currently has only an "Apple Development" cert) and creating
      a notarytool keychain profile. Do this before the next public release.

## Maintenance note

- [ ] `bin/plugin.js` is committed as a self-contained bundle so drag-and-drop /
      Homebrew installs work. **Rebuild (`npm run build`) and commit it whenever
      source changes**, or the installed copy ships stale code. A pre-release
      check or CI step should enforce this.
