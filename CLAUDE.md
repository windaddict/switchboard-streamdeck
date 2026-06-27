# Switchboard — Stream Deck plugin (developer guide)

A macOS Stream Deck plugin (public name **Switchboard**, by Moving Average Labs).
Built with the Elgato SDK v2 (TypeScript/Node). The plugin **UUID stays
`com.johnknox.safarijump`** — do NOT change it; installed buttons reference it,
and renaming orphans the user's configured keys. The display name/category are
"Switchboard"; that's cosmetic and safe to change.

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
com.johnknox.safarijump.sdPlugin/
  manifest.json             # actions, layouts, icons, CodePath -> bin/plugin.js
  ui/*.html                 # property inspectors (sdpi-components from CDN)
  layouts/*.json            # custom encoder (touchscreen) layouts
  imgs/actions/<a>/*.png    # icon.png/@2x + key.png/@2x per action
  bin/plugin.js             # rollup output (gitignored)
  bin/macos/scroll          # compiled Swift helper (committed, arm64)
helper/scroll.swift         # native CGScrollWheel poster (see scroll dial)
```

**Design rule:** put all logic in pure `src/mac/*` (or `safari/*`) functions and
unit-test them; keep `src/actions/*` as a thin shell that wires SDK events to
those functions. Every action's hard part lives in a tested pure module.

## Dev loop

```
npm run typecheck     # tsc --noEmit
npm test              # vitest (pure modules)
npm run build         # rollup -> bin/plugin.js, then postbuild runs `streamdeck validate`
npm run build:helper  # swiftc helper/scroll.swift -> bin/macos/scroll (rarely needed)
npx @elgato/cli restart com.johnknox.safarijump   # reload the plugin live
```

**Reload semantics (important):**
- **Code-only change** (rebuilt `bin/plugin.js`): `streamdeck restart` (above) reloads it live — no app restart.
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
- **Two distinct macOS permissions, classified separately** in `applescript/runner.ts`:
  Automation (Apple Events, error **-1743**) for controlling apps via AppleScript;
  Accessibility (error **-1719**) for keystrokes / scroll / `CGEventPost`. Surface
  the right re-enable path; never fail silently.
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
2. Write the action shell in `src/actions/<feature>.ts` (`@action({ UUID: "com.johnknox.safarijump.<x>" })`).
3. Register it in `src/plugin.ts`.
4. Add the action object to `manifest.json` (Keypad or Encoder; custom `layout` if needed).
5. Add icons under `imgs/actions/<x>/` (and a PI under `ui/` if it has settings).
6. `npm run typecheck && npm test && npm run build`, then `npx @elgato/cli restart …`.
   **Quit + relaunch Stream Deck** so the new action shows in the list.

## Context

This plugin is also a marketing/credibility artifact for John Knox / Moving
Average (AI-advisor positioning) — see the strategy doc + flagship essay
("I Directed an AI to Ship Real Software"). Framing: built by *directing* an AI
agent, shared as-is. Keep it tested and honest; the README leads with the story,
dev detail second.
