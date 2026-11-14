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
- [ ] **pgrep exit 0 with no pid lines reads as "none running".** `codex-scan.ts`
      and `cursor-scan.ts` return `status: "ok"` with no instances when pgrep
      succeeds but prints nothing parseable. Exit 0 means pgrep matched
      something, so that output is inconsistent and should read as unknown. The
      codex cache-order test feeds `cb(null, "", "")` as its clean empty scan and
      would move to a real exit-1 fixture. Found by the Impasse review of
      `2703367` (2026-11-12); not in that commit's scope.
- [ ] **AI Project capture trusts the raw tty when BOTH tmux listings fail.**
      `capture` refuses only when `list-clients` fails while `list-panes`
      answered. If both fail with tmux running (a timeout, say), the client map
      is empty and the capture falls through to the focused tty, which can bind
      an agent suspended on the client's tty instead of the one in the active
      pane. Refusing whenever both fail would also refuse every capture on a
      machine with no tmux server, so the fix needs to tell "no server running"
      apart from a failed probe. Found by the Impasse re-review of `b802517`
      (2026-11-12); the guard dates from `36f2d01`.

## Refactors / cleanup (deferred, deliberate)

- [ ] Extract a `PolledKeyAction` base class for the visible-Map + poll-timer
      scaffold shared by `open-file.ts` and `window-ring.ts` (medium risk — the
      action shells have no direct unit tests).
- [x] Extract a parameterized permission-message helper (Accessibility vs
      Automation). Done for the six dials: `src/mac/dial-outcome.ts`. Key shells
      still use `focus-outcome.ts`.
- [ ] Remove dead `FileStatus "plain"` (`src/mac/key-image.ts`); decide whether
      to keep `matchesGlob` (`src/mac/files.ts`, used only by tests).
- [ ] Extract Open File's status-state computation into a pure `fileStatus(...)`
      helper + test.

- [ ] **Upgrade `@elgato/streamdeck` 1.4.1 to 3.x.** Touch points: `streamDeck.ui.current`
      (`pi-permissions.ts`, `focus-tmux.ts`), `onDidReceiveSettings` overrides
      (`open-file.ts`, `paste-snippet.ts`), mandatory settings generics on
      `DialAction`/`KeyAction`, and the tsconfig move to NodeNext. The three
      legacy actions it was to be paired with were retired in v2.0.0, so it now
      stands alone.
- [ ] Skip the poll timer for `isInMultiAction` instances of Focus tmux, Open File
      and Paste Snippet (their face is never drawn there).

- [ ] **List icons look smaller than other plugins' icons** in the Stream Deck
      action list (operator, 2026-10-05, after the white-icon change passed its
      live check). Measured: on the 40 px `icon@2x.png` the glyph's opaque
      bounding box is 24-32 px wide (60-80% of the canvas), because
      `icon_svg()` in `scripts/make-icons.py` reuses the key-face 72-unit
      viewBox with its key-face padding. Likely fix, not yet tried: give list
      icons a tighter viewBox (crop to the glyph plus a small margin), then
      rerun `make-icons.py`, check `tests/icons.test.ts` (its REGIONS
      rectangles are in 20 px coordinates and will move), and compare against
      another plugin's icons in the action list.

- [ ] **Update the dev dependencies Dependabot flags.** 12 open alerts on
      2026-10-08 (2 critical), all development-scope: tinypool, fast-uri,
      source-map-js, brace-expansion, vitest/@vitest/mocker. None is in the
      shipped bundle (runtime deps: @elgato/streamdeck, @elgato/schemas, ws).
- [ ] **Delete the exports the v2.0.0 retirement left test-only.** With the
      Claude/Codex/Cursor Project keys gone, these have no production caller:
      `claude-project.ts` `projectClaudeState`, `instancesForProject`,
      `projectBasename`; `codex-project.ts` `codexInstancesForProject`,
      `selectCodexInstance`, `LIST_CODEX_PANES_ARGS`, `parseCodexPanes`,
      `codexTmuxFocusArgs`; `cursor-project.ts` `cursorInstancesForProject`,
      `selectCursorInstance`, `decideCursorFace`, `paneForTty`,
      `paneShowsApprovalPrompt`, `capturePaneArgs` and its five re-exports;
      `cursor-scan.ts` `invalidateCursorScan`. Delete them with their tests,
      checking importers first (each module header lists its own).
- [ ] **A migration script for retired keys, only if a user asks.** v2.0.0
      documents the removal instead. A rewrite of the profile store would swap
      the action UUID for `aiproject` AND insert `agent` (`claude`/`codex`/
      `cursor`); a bare UUID swap leaves a dead gray key (`ai-project.ts`
      reads `settings.agent`). It must run with Stream Deck quit and back up
      `ProfilesV3` first, like `scripts/rename.sh`.
- [ ] **Rate-limit dial failure logging.** A dial logs one line per detent:
      on 2026-10-05, one spin of Scroll with Accessibility revoked wrote 12
      identical "Scroll Window blocked" ERROR lines in 3 s (and BBEdit wrote 5
      in 3 s). CLAUDE.md says to rate-limit anything that can fire in a loop.
      Likely fix: in `reportDial`, log a repeated identical message at most
      once per few seconds per dial, still alerting every time.
- [ ] **BBEdit "no BBEdit?" path may be unreachable by quitting BBEdit.**
      `BBEDIT_LIST_SCRIPT` opens with `tell application "BBEdit"`, which
      launches BBEdit if it is not running, so quitting it probably relaunches
      it instead of failing. Not tested. If confirmed, either guard with
      `if application "BBEdit" is running` (and decide what the dial should do)
      or drop the hint. The 2026-10-05 live check used a revoked Automation
      grant instead, which does fail ("grant access").

## Tests

- [ ] Cover `resolveTarget` bare-URL → `derivePattern` path (targets.ts) and
      `titleClause` all-empty pattern (safari/applescript.ts).

## Release / publishing

- [x] **Released.** v1.0.0 and v1.1.0 are out (GitHub + Homebrew tap). The full,
      ordered runbook is now `/release` (`.claude/commands/release.md`); the
      CLAUDE.md "Releasing" section summarizes it.
- [x] `packaging/homebrew/switchboard.rb` filled + the `windaddict/homebrew-switchboard`
      tap is live and verified (`brew fetch` matches the release sha).
- [x] GitHub repo About + topics + social-preview image set.
- [x] Flagship-essay link wired in `README.md`
      (movingavg.com/essays/directing-ai-to-ship-real-software.html).
- [x] Hero showcase image (`docs/switchboard-hero.png`), regenerated from the
      manifest by `scripts/make-hero.py`. A true animated demo GIF still needs a
      real Stream Deck screen recording (optional).

## Security / privacy (from the security review)

- [x] **Commit-author email scrubbed.** History was rewritten so every commit
      carries `4132973+windaddict@users.noreply.github.com`; the repo's local
      `user.email` is set to the same noreply address. Zero occurrences of the
      old personal email remain. No secrets/keys/PII were found in the tree or
      history.
- [x] **Native helpers signed + notarized** (shipped in v1.1.0). Universal
      (arm64+x86_64), Developer ID "Moving Average Inc. (9CHGJ6ZAE6)", notarized
      (status Accepted). Pipeline: `bundle exec fastlane mac notarize_helpers`
      (see CLAUDE.md "Signing & notarization"). Re-run only when a `helper/*.swift`
      changes, then commit the freshly signed binaries before releasing.

## Maintenance note

- [ ] `bin/plugin.js` is committed as a self-contained bundle so drag-and-drop /
      Homebrew installs work. **Rebuild (`npm run build`) and commit it whenever
      source changes**, or the installed copy ships stale code. A pre-release
      check or CI step should enforce this.

## Claude state via `claude agents --json` (follow-ups)

- [ ] Bind Claude keys by the `sessionId` that `claude agents --json` now
      exposes, gated on a minimum CLI version. Not done now: an old CLI gives an
      empty id, which would orphan configured keys.
- [ ] Retire the title/transcript fallback once that minimum version is enforced.
- [ ] Stuck `busy` after parking a mid-flight turn (claudeissues #87131): consider
      a transcript-quiet timeout only if it is observed on the deck.
- [ ] Find the `claude` binary from a detected process's executable path, so
      installs outside the four fixed locations get the CLI report.
- [ ] Measure an attached background session (`claude --bg`, then `claude attach`):
      does its `claude agents --json` entry carry `pid`/`status`, and is that pid a
      tty-bearing process that `claude-scan` detects? Only if both hold, merge
      background entries with an integer `pid` and string `status` in
      `parseClaudeAgents` (today they are ignored and fall back).
- [ ] The folder-trust prompt never shows amber: `claude agents --json` does not
      list a session while that prompt is up (measured on 2.1.311, 2026-11-12).
      Decide whether a pane scrape for it is worth adding.
- [ ] Run the `agents-json-live` checks in Terminal.app; only tmux and bare
      iTerm2 were run live (2026-11-12).
