# Switchboard — Stream Deck plugin (developer guide)

A macOS Stream Deck plugin (public name **Switchboard**, by Moving Average Labs).
Built with the Elgato SDK v2 (TypeScript/Node). The plugin **UUID is
`com.movingavg.switchboard`** (renamed from the legacy `com.johnknox.safarijump`).
Don't change it casually — installed buttons reference it, so a change orphans
configured keys unless migrated. `scripts/rename.sh` performs such a migration
(it rewrites the UUIDs in the Stream Deck profile store so settings survive); see
that script before ever renaming again. Eleven actions today (the manifest is the
source of truth — `scripts/make-hero.py` reads it).

## Layout

```
src/
  plugin.ts                 # entry: registers every action, streamDeck.connect()
  actions/*.ts              # thin SDK glue per action (onKeyDown/onDialRotate/…)
  applescript/
    escape.ts               # escapeForAppleScript (shared)
    runner.ts               # runAppleScript via osascript; classifyError (TCC)
  mac/                      # PURE, tested logic (no SDK, no I/O)
    targets/safari ...      # see files below
  safari/                   # Safari tab logic (targets.ts, applescript.ts, runner re-export)
tests/*.test.ts             # vitest; one file per pure module
com.movingavg.switchboard.sdPlugin/
  manifest.json             # actions, layouts, icons, CodePath -> bin/plugin.js
  ui/*.html                 # property inspectors (sdpi-components from CDN)
  ui/lib/permissions.js     # shared PI Accessibility-warning banner (see below)
  layouts/*.json            # custom encoder (touchscreen) layouts
  imgs/actions/<a>/*.png    # icon.png/@2x + key.png/@2x per action
  bin/plugin.js             # rollup output — COMMITTED (self-contained bundle)
  bin/macos/{scroll,tile,axcheck}  # compiled Swift helpers — committed, UNIVERSAL
                            #   (arm64+x86_64), Developer ID signed + notarized
helper/{scroll,tile,axcheck}.swift # native helpers (scroll wheel / window tiling / AX probe)
scripts/
  build-helpers.sh          # build the 3 helpers universal; auto-sign if a Developer ID cert is present
  notarize-helpers.sh       # no-Fastlane notarize fallback
  make-hero.py              # regenerate docs/switchboard-hero.png from the manifest
  rename.sh                 # UUID migration tool (see Rename section)
fastlane/                   # Developer ID signing + notarization (see Releasing)
```

**Design rule:** put all logic in pure `src/mac/*` (or `safari/*`) functions and
unit-test them; keep `src/actions/*` as a thin shell that wires SDK events to
those functions. Every action's hard part lives in a tested pure module.

**Interaction grammar (keep it consistent):** rotate = browse a set; dial press
= escape to a known place (top / maximize / last window / previous doc / exit
copy-mode) or toggle the mode when there is no "known place"; touchscreen tap =
flip the dial's mode/scope (speed, windows↔apps, panes↔windows, session↔ALL,
tile arrangement A↔B) and the strip always shows the current mode (shared
`layouts/mode-dial.json` + a per-action `*Feedback()` pure fn); key long-press (500ms, `PressGate` in
`src/mac/press-gate.ts`, fires AT the threshold) = capture the current context
into the button ("teach the button": front tab / frontmost app / current tmux
window; Window Ring's add/remove is the same gesture). Modes/scopes are
transient per-dial memory (Map keyed by action id, cleared onWillDisappear) —
they intentionally reset to the default on appearance.

## Dev loop

```
npm run typecheck     # tsc --noEmit
npm test              # vitest (pure modules) — 329 tests today
npm run build         # rollup -> bin/plugin.js, then postbuild runs `streamdeck validate`
npm run build:helper  # build all 3 Swift helpers UNIVERSAL (scripts/build-helpers.sh);
                      #   auto-signs with Developer ID if that cert is in the keychain
python3 scripts/make-hero.py   # regenerate the README hero after adding/renaming actions
npx @elgato/cli restart com.movingavg.switchboard   # reload the plugin live
```

**Committed build artifacts (important):** unlike a typical SDK plugin, both
`bin/plugin.js` (the rollup bundle, with the SDK bundled in — `external: []`) and
the three `bin/macos/*` helpers are **committed**, so the `.sdPlugin` folder is
self-contained for drag-and-drop / Homebrew installs. Therefore: **after any
source change, `npm run build` and commit the updated `bin/plugin.js`**, or the
installed copy ships stale code. The `build` step is gated by `streamdeck validate`.

**Reload semantics (important):**
- **Code-only change** (rebuilt `bin/plugin.js`): `streamdeck restart` (above) reloads it live — no app restart.
- **`streamdeck restart` silently no-ops on this setup** (SD 7.5): the CLI prints
  ✔ and StreamDeck.log shows the deep link "Handled", yet the old plugin process
  keeps running (bit us twice in one day — new features "didn't work" because the
  deck was still on a days-old bundle). ALWAYS verify the reload took:
  `ps -o lstart -p $(pgrep -f switchboard.sdPlugin/bin/plugin.js)` — the start time
  must be *now*. Reliable reload: `kill $(pgrep -f switchboard.sdPlugin/bin/plugin.js)`
  — Stream Deck respawns the plugin within seconds on the new bundle. Full app
  relaunch (`killall "Stream Deck" && open -a "Elgato Stream Deck"`) only needed
  for manifest changes; an osascript `quit` may be blocked with error -128.
- **Manifest change that adds/renames an ACTION**: the Stream Deck app caches the
  action list — the user must **fully quit and relaunch Stream Deck** for new
  actions to appear. PI/code changes don't need this; new actions do.
- Property-inspector HTML is re-served whenever the inspector is opened; just reopen it.

## Hard-won gotchas (this codebase hit all of these)

- **Node plugins require `"CodePath": "bin/plugin.js"` in the manifest.** Without
  it Stream Deck rejects the plugin ("missing code path") and no actions appear.
- **Settings types must be `type`, not `interface`.** `SingletonAction<T>` needs
  `T extends JsonObject` (an index signature). An `interface` fails to satisfy it;
  a `type` alias gets an implicit index signature. Same for any object passed to
  `setFeedback` (FeedbackPayload).
- **`sdpi-select` does NOT persist its default until actively changed.** A button
  left on the first shown option saves no value (bit us on Gmail service + the
  tmux window dropdown). Fix: default in the ACTION code (`x ?? "..."`) and/or
  have the PI persist the shown value on load.
- **The built-in $B1 layout's `title` item ignores `setFeedback` pushes** — it is
  bound to the user-editable action title, so a plugin cannot change it at
  runtime (the `value` item updates fine; bit us on the App Windows mode label).
  For any plugin-driven text above the value line, use a CUSTOM layout with your
  own item keys (`layouts/mode-dial.json`, painted via `*Feedback()` fns).
  A layout/manifest change needs a full Stream Deck quit + relaunch to take.
- **`UserTitleEnabled: false` hides the Title FIELD but not a stored title.** A
  title the user already typed keeps rendering over the key image (bit us on the
  live tmux key face — it overlapped the status-bar cursor). To stop the title
  being DRAWN, set `"ShowTitle": false` on the action's manifest State. Use both
  for a fully plugin-owned key face.
- **Layout (touchscreen) items must NOT overlap.** You can't layer text over a
  full-area pixmap. To draw text on a background, render everything in ONE SVG
  pixmap (`buildBackgroundSvg`) — see `mac/tmux-window.ts` + `layouts/tmux-window.json`.
- **SVG data URIs work** as `setImage` (keys) and pixmap (`setFeedback`) values:
  `data:image/svg+xml;base64,<b64>`. Lets you render dynamic graphics with no
  rasterizer at runtime. XML-escape any user text in the SVG.
- **Synthetic keystrokes coalesce.** Sending N arrow keys back-to-back via System
  Events drops most of them, so "lines per tick" didn't scale. The scroll dial now
  posts ONE proportional `CGScrollWheel` event via the native `bin/macos/scroll`
  helper. For one-shot keys (Cmd+↑, Cmd+`) keystrokes are fine.
- **Safari returns `missing value` (no error!) for `URL of tab` / `name of tab`**
  on an unloaded session-restored tab. A `try/on error` guard doesn't catch it, and
  `length of missing value` throws -1728, killing the whole tab scan — one stale
  tab broke every Jump to Tab button. Coerce `missing value` to `""` explicitly
  (see `buildNormalScript` in `src/safari/applescript.ts`).
- **Two distinct macOS permissions, classified separately** in `applescript/runner.ts`:
  Automation (Apple Events, error **-1743**) for controlling apps via AppleScript;
  Accessibility (error **-1719**) for keystrokes / scroll / `CGEventPost`. Surface
  the right re-enable path; never fail silently.
- **Live Accessibility warning in the PI.** Actions needing Accessibility show a
  ⚠️ banner in their settings screen when the grant is missing. Wiring: the PI
  includes `<script src="lib/permissions.js"></script>` (self-injects the banner
  + Re-check button), which sends `{event:"checkAccessibility"}` to the plugin;
  the action's `onSendToPlugin` calls `respondToAccessibilityCheck(ev.payload,
  import.meta.url)` (`src/actions/pi-permissions.ts`), which runs the side-effect-
  free `bin/macos/axcheck` probe and replies. Only a definitive `untrusted` shows
  the banner (missing/old helper → treated as granted, no false alarm). Automation
  (Apple Events) can't be probed without prompting, so those PIs use a static
  *Requires* note instead.
- **Dial direction.** `mac/rotation.ts` maps ticks → `next`/`prev` (positive =
  clockwise per the SDK). For a *visible* rotation (the tile dial orbiting a
  window) the on-hardware sign can feel inverted; `tile-dial.ts` exposes an
  **Invert dial direction** setting rather than hard-coding a sign. Don't change
  the shared `rotationDirection` to "fix" one action — flip at the action boundary.
- **PI ↔ plugin messaging** uses `SDPIComponents.streamDeckClient`: receive with
  `.sendToPropertyInspector.subscribe(e => e.payload)`, send with
  `.send("sendToPlugin", payload)`. The dropdown `datasource=` mechanism and the
  permission check both ride this (see `focus-tmux.ts` / `pi-permissions.ts`).
- **`fs` does not expand `~`.** Resolve a leading tilde yourself (`files.ts`
  `expandHome`). Stream Deck also launches plugins with a **minimal PATH** — use
  absolute binary paths (e.g. `tmux-runner.ts` `findTmuxPath` probes
  `/opt/homebrew/bin/tmux` …).
- **tmux ↔ iTerm mapping:** a tmux session's attached client tty (`list-clients`)
  equals the iTerm2 session's `tty`. Match on that to raise the right GUI window
  (`mac/iterm.ts`). Detached tmux commands act on tmux's "current" pane/window,
  which is usually—but not always—what the user is looking at.
- **PI file pickers:** the SD webview exposes a chosen file's absolute path on
  `file.path` (what `<sdpi-file>` relies on). Folders use `<input webkitdirectory>`
  + deriving the path (see `ui/open-file.html`).
- **Icons** are rasterized from SVGs with `inkscape --export-type=png` at
  20/40/72/144; loop quoting in bash is finicky — invoke inkscape per size.

## Adding a new action

1. Write the pure logic + tests in `src/mac/<feature>.ts` + `tests/<feature>.test.ts`.
2. Write the action shell in `src/actions/<feature>.ts` (`@action({ UUID: "com.movingavg.switchboard.<x>" })`).
3. Register it in `src/plugin.ts`.
4. Add the action object to `manifest.json` (Keypad or Encoder; custom `layout` if needed; `PropertyInspectorPath` if it has a settings screen).
5. Add icons under `imgs/actions/<x>/` (icon 20/40 + key 72/144 via `inkscape`).
   Add a PI under `ui/` — include `<script src="lib/permissions.js"></script>`
   if the action needs Accessibility (and wire `onSendToPlugin` →
   `respondToAccessibilityCheck`); add a **Requires:** note for any app/permission.
6. **Native helper?** add `helper/<x>.swift`, a `build()` line in
   `scripts/build-helpers.sh`, and a runner in `src/mac/` that resolves the binary
   via `import.meta.url` (see `tile-runner.ts`). Run `npm run build:helper`.
7. `npm run typecheck && npm test && npm run build` (commits-worthy: also the
   rebuilt `bin/plugin.js`), then `npx @elgato/cli restart …`. **Quit + relaunch
   Stream Deck** so the new action shows in the list.
8. `python3 scripts/make-hero.py` to refresh the README hero, and bump the action
   count + test count in `README.md`.

## Releasing (the end-to-end runbook lives in `.claude/commands/release.md`)

Short version — see that command for the exact, ordered steps:

1. Bump `package.json` version; update README counts. Commit, `git push origin main`.
2. `npm run build` (NOT `build:helper` — see below) then `npm run pack` +
   `npm run pack:zip` → `dist/*.streamDeckPlugin` + `dist/*.sdPlugin.zip`.
3. `shasum -a 256 dist/com.movingavg.switchboard.sdPlugin.zip`; put that version +
   sha in BOTH `packaging/homebrew/switchboard.rb` (this repo) and
   `~/code/homebrew-switchboard/Casks/switchboard.rb` (the **separate tap repo**).
   Commit + push both.
4. `gh release create vX.Y.Z dist/...streamDeckPlugin dist/...sdPlugin.zip --repo
   windaddict/switchboard-streamdeck --title … --notes …`.
5. Verify: `brew update && brew fetch --cask windaddict/switchboard/switchboard`
   should print `✔︎ Cask switchboard (X.Y.Z)`.

**CRITICAL — ship the exact notarized binaries.** The `bin/macos/*` helpers are
notarized by their content hash. `npm run build` only rebuilds `bin/plugin.js`
(JS, fine). **Do NOT run `npm run build:helper` during a release** — re-signing
changes the binaries' hashes and invalidates notarization. Only rebuild helpers
when their `.swift` changed, and then re-notarize (below) before releasing.

## Signing & notarization (Fastlane, mirrors the Passages project)

The helpers must be **Developer ID signed + notarized** or Gatekeeper blocks them
on a downloaded install (Scroll/Arrange silently do nothing on someone else's Mac).

- One command: `bundle exec fastlane mac notarize_helpers`. It fetches the
  Developer ID cert (readonly `match developer_id`, falling back to the keychain),
  rebuilds + signs the helpers, and notarizes the zip via the App Store Connect
  API key (`~/.keys/AuthKey_RP35L4P23G.p8`, Team `9CHGJ6ZAE6`).
- **One-time, Account Holder only:** Apple forbids creating a Developer ID cert
  via API key. Create it once in **Xcode → Settings → Accounts → 9CHGJ6ZAE6 →
  Manage Certificates → + → Developer ID Application**. The lane never tries to
  create it.
- After notarization, **commit the freshly signed `bin/macos/*`** — those exact
  files are what Apple notarized and what the release must ship. Then cut the
  release (above) WITHOUT rerunning `build:helper`.
- Gotchas baked into the Fastfile (don't undo them): `match` needs
  `app_identifier: []` (it validates every identifier *before* honoring
  `skip_provisioning_profiles`); `notarize` in this fastlane version has no
  `use_notarytool` option; bare CLI binaries can't be stapled (`skip_stapling`),
  so Gatekeeper verifies them online on first run.
- **Debugging the Fastfile:** `bundle exec fastlane lanes` parses + lists lanes
  without contacting Apple. When an action rejects an option or errors cryptically,
  read the installed gem source rather than guessing —
  `bundle exec ruby -e 'puts Gem::Specification.find_by_name("match").gem_dir'` —
  (that's how `app_identifier: []` and the dropped `use_notarytool` were found).

## Git & commits

- This repo commits as the GitHub **noreply** email
  (`4132973+windaddict@users.noreply.github.com`, set as the repo-local
  `user.email`) — history was scrubbed of the personal address. Don't reintroduce it.
- Commit each logical unit separately; messages `type: description` (`feat | fix |
  docs | build | release | chore`). Push only when asked / at a clean checkpoint.
- **`chmod` is unavailable here.** To mark a script executable in git:
  `git add <f>` then `git update-index --chmod=+x <f>`. That sets the index mode
  but not the working-tree mode, so the file then shows "modified" — fix the disk
  mode with `git checkout -- <f>`.

## Rename — COMPLETED (legacy `com.johnknox.safarijump` → `com.movingavg.switchboard`)

The full rename is **done** (UUID + all action UUIDs, the `.sdPlugin` folder,
`rollup.config.mjs`, `package.json` name, the repo directory, and the Stream Deck
symlink). `scripts/rename.sh` performed it and **migrated the configured buttons**
by rewriting the action UUIDs in the Stream Deck profile store (settings preserved
— no re-configuring). The script remains as the tool to re-run if the id ever
changes again: quit Stream Deck, then `scripts/rename.sh --dry-run` to preview,
`scripts/rename.sh --yes` to apply.

What a UUID rename touches (the script covers all of these — reference list):
1. `manifest.json` — plugin `UUID` + every action `UUID` (10 actions).
2. **`src/actions/*.ts` `@action({ UUID })` decorators** — easy to forget; a
   manifest/code UUID mismatch makes the SDK reject the plugin and Stream Deck
   *disables* it (recover with a full SD quit+relaunch). The script now sed-replaces
   across the whole repo (`grep -rl`) precisely to avoid this.
3. The `.sdPlugin` folder name, `rollup.config.mjs` const, `package.json` name +
   `build:helper`/`validate` paths, `tests/scroll-runner.test.ts` path literals,
   README/CLAUDE self-references, the repo directory, and the SD Plugins symlink.

`import.meta.url` resolves the scroll helper relative to the bundle, so no code
change is needed there once the folder is renamed. After renaming the live folder,
Stream Deck caches the old plugin path — **fully quit + relaunch SD** so it
re-resolves the symlink (a CLI `restart` re-uses the stale path).

## Context

This plugin is also a marketing/credibility artifact for John Knox / Moving
Average (AI-advisor positioning) — see the strategy doc + flagship essay
("I Directed an AI to Ship Real Software"). Framing: built by *directing* an AI
agent, shared as-is. Keep it tested and honest; the README leads with the story,
dev detail second.
