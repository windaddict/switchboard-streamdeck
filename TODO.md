# Switchboard — TODO

Open items noted during the build/review. Nothing here is a known crash; the
plugin is shippable as-is.

## Bugs / correctness (from the code review)

- [ ] **Private-window Safari safety.** `buildPrivateScript` (`src/safari/applescript.ts`)
      uses fixed `delay 0.2/0.4` after ⌘⇧N. Under load a slow private-window open
      could let `set URL of front document` navigate the user's *current* tab.
      Poll for the new window instead of using fixed delays.
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
- [ ] Fill `packaging/homebrew/switchboard.rb`: OWNER, version, sha256 of the zip;
      host in a `homebrew-switchboard` tap.
- [ ] Set the GitHub repo **About** + **topics** (`stream-deck`, `streamdeck-plugin`,
      `elgato`, `macos`, `tmux`, `iterm2`, `bbedit`, `safari`, `window-manager`,
      `automation`) and a social-preview image.
- [ ] Replace the flagship-essay placeholder link in `README.md` once published.
- [ ] Add a screenshot / short demo GIF to the README.

## Security / privacy (from the security review)

- [ ] **Commit-author email is public.** Every commit carries
      `john@windaddict.com`. Before the first public push, decide whether to keep
      it or scrub it (set a GitHub `noreply` email and rewrite history with
      `git filter-repo`). No secrets/keys/PII were found in the tree or history.

## Maintenance note

- [ ] `bin/plugin.js` is committed as a self-contained bundle so drag-and-drop /
      Homebrew installs work. **Rebuild (`npm run build`) and commit it whenever
      source changes**, or the installed copy ships stale code. A pre-release
      check or CI step should enforce this.
