# Switchboard — Stream Deck plugin (developer guide)

A macOS Stream Deck plugin (public name **Switchboard**, by Moving Average Labs).
Built with the Elgato SDK v2 (TypeScript/Node). The plugin **UUID is
`com.movingavg.switchboard`** (renamed from the legacy `com.johnknox.safarijump`).
Don't change it casually — installed buttons reference it, so a change orphans
configured keys unless migrated. `scripts/rename.sh` performs such a migration
(it rewrites the UUIDs in the Stream Deck profile store so settings survive); see
that script before ever renaming again. Sixteen actions today (the manifest is the
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
  mac/agent-*.ts            # AI Project (supersedes the three per-agent keys):
                            #   agent-project (one AgentKind/AgentState vocabulary,
                            #   per-kind approval-prompt matchers, decideAgentFace,
                            #   per-kind key face), agent-scan (ADAPTER over the three
                            #   existing scanners — never a fourth scanner)
  mac/deprecation.ts        # the badge on the three superseded key faces; DELETE
                            #   this whole file when those actions are retired
  mac/cursor-*.ts           # Cursor CLI detection: cursor-scan (pgrep -f the installed
                            #   versions path -> ps -o pid=,ppid=,tty=,args= -> lsof), cursor-project
                            #   (identity + turn_ended state + approval-prompt scrape + key face)
  mac/claude-*.ts           # Claude Code detection: claude-scan (ps→batched lsof +
                            #   shell-snapshot busy children = "N shells still running"; pgrep
                            #   misses ancestors), claude-state (title marker: braille=working,
                            #   ✳=waiting; tmux pane-tty map), claude-transcript (~/.claude/
                            #   projects freshness), claude-project (state decision + key face)
  mac/{coalesce,serialize,press-gate}.ts  # shared async plumbing (all unit-tested)
  mac/pasteboard-stash.ts    # Paste Snippet's clipboard save/restore: copies the
                            #   WHOLE pasteboard (every item, every type) into a
                            #   named stash pasteboard and back, so a gesture
                            #   borrows the clipboard instead of keeping it.
                            #   NEVER stashes a ConcealedType clipboard.
  mac/snippet.ts             # Paste Snippet pure logic: size cap, and the four key
                            #   faces — preview (the default, whatever the text's
                            #   provenance), masked (opt-in per key), blank
                            #   (whitespace-only) and over-cap. Key-face SVG.
  mac/clipboard-snippet.ts   # Paste Snippet's ⌘C/⌘V route: the capture poll, the
                            #   snippet write (build the item, THEN clear), the
                            #   per-write ownership token, and the gesture
                            #   orchestration that saves/restores the clipboard
  mac/ax-text.ts             # Paste Snippet's no-clipboard route, CAPTURE ONLY:
                            #   captureViaAx reads AXSelectedText on the frontmost
                            #   app's focused element via System Events. Framed
                            #   `ok\n<text>` / nosel / unsupported / err|<n> — status
                            #   on the first line, payload after the first newline, so
                            #   selection text can't corrupt the framing. insertViaAx
                            #   exists but is NOT on the live path: the AX write was
                            #   measured reporting success while inserting nothing
tests/*.test.ts             # vitest; one file per pure module
com.movingavg.switchboard.sdPlugin/
  manifest.json             # actions, layouts, icons, CodePath -> bin/plugin.js
  ui/*.html                 # property inspectors (sdpi-components bundled in ui/lib/)
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
they intentionally reset to the default on appearance. EXCEPTION: the tmux
pane dial's panes/windows mode persists in settings (user request). BOTH tmux
dials scope every command to the client/session in the FRONTMOST macOS window
via `resolveFrontTmux` (`src/mac/front-tmux.ts`, ~0.3s probe cached 2s) and DO
NOTHING when iTerm isn't frontmost (strip shows a dash) — untargeted tmux
commands act on tmux's own "current" session/client, which can be a background
terminal.

## Dev loop

```
npm run typecheck     # tsc --noEmit
npm test              # vitest (pure modules) — 1041 tests today
npm run build         # rollup -> bin/plugin.js, then postbuild runs `streamdeck validate`
npm run build:helper  # build all 3 Swift helpers UNIVERSAL (scripts/build-helpers.sh);
                      #   auto-signs with Developer ID if that cert is in the keychain
python3 scripts/make-icons.py  # regenerate ALL key faces + list icons from the design system
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
  If `kill` is denied by the permission prompt, ask the operator to run
  `! kill <pid>` themselves. An EMPTY `pgrep` means the Stream Deck app isn't
  running at all — check before concluding the plugin died.
- **Debugging the LIVE plugin:** temporarily add
  `import { appendFileSync } from "node:fs"` and trace to `/tmp/sb-trace.log`
  inside the poll, rebuild, kill-respawn, read the file, then STRIP the trace.
  (`require()` throws in the ESM bundle — and the resulting per-tick throw is
  swallowed by CoalescedRunner, so a broken trace looks like a dead poll.)
  This is how the C-locale bug was caught: the trace showed the plugin's raw
  bytes differing from every shell probe.
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
- **The KEY rasterizer paints `hsl()` colors as BLACK** (the touchscreen pixmap
  pipeline renders them fine). Cost three debugging rounds on the tmux key face:
  every hex element showed, every hsl() element was "invisible" black-on-black.
  Key-face SVGs must emit hex only — convert with `hslToHex` (`src/mac/svg.ts`);
  a tmux-key test asserts no `hsl(` literal survives.
- **Synthetic keystrokes coalesce.** Sending N arrow keys back-to-back via System
  Events drops most of them, so "lines per tick" didn't scale. The scroll dial now
  posts ONE proportional `CGScrollWheel` event via the native `bin/macos/scroll`
  helper. For one-shot keys (Cmd+↑, Cmd+`) keystrokes are fine.
- **Safari returns `missing value` (no error!) for `URL of tab` / `name of tab`**
  on an unloaded session-restored tab. A `try/on error` guard doesn't catch it, and
  `length of missing value` throws -1728, killing the whole tab scan — one stale
  tab broke every Jump to Tab button. Coerce `missing value` to `""` explicitly
  (see `buildNormalScript` in `src/safari/applescript.ts`).
- **Stream Deck's minimal env has NO LANG/LC_ALL → child processes run in the C
  locale → tmux TRANSLITERATES all non-ASCII output to "_"** — the Claude
  braille/✳ title markers arrived as underscores and every session read
  "waiting" ON-DEVICE while every UTF-8 shell probe looked correct (hid for a
  week; found only by tracing the plugin's raw stdout). ALL subprocess runners
  must pass `env: UTF8_ENV` (exported from `tmux-runner.ts`). When on-device
  behavior contradicts an out-of-process probe, suspect the ENVIRONMENT first
  and dump the plugin's raw bytes.
- **Polling actions must repaint through `CoalescedRunner`** (`src/mac/coalesce.ts`).
  A bare `if (refreshing) return` guard silently DROPPED the explicit repaint after
  hold-to-capture whenever it collided with an in-flight poll tick — shipped as a
  "stale hot indicator" bug. Never guard-and-drop; coalesce.
- **Scripted doc edits: verify the replaced string is unique first.** A python
  `str.replace` targeting a "What it does" bullet also matched the README intro and
  shipped it broken (bullet spliced mid-sentence) for two releases. Re-read the
  rendered section after any scripted edit.
- **An empty `sessionId` means two different things — never conflate them.** On a
  KEY it means "nothing captured"; on an INSTANCE it means "present but we cannot
  name its conversation" (a Cursor session that has never been prompted holds NO
  chat store open — measured: zero handles under `~/.cursor/chats`). Conflating
  them let `capture()` store an empty binding that afterwards adopted whichever
  sole session sat in the folder. `bindsBySession(kind)` is the discriminator:
  Codex and Cursor have conversation ids, Claude does not.
- **"Present but unidentifiable" is NOT "the probe failed" — for Cursor.** An
  unprompted Cursor session is a normal state and is returned with an empty
  sessionId under `status: "ok"`; flagging it as a failure grayed out every
  Cursor key on the machine. Codex is the opposite: an unreadable rollout
  originator means a live process could not be CLASSIFIED (interactive vs
  `codex exec`), which is not normal, so it stays incomplete.
- **The tmux key's spark covers all three agents, matched by TTY.** Never by
  `pane_current_command` — that is why the old Claude-only check could not see
  Cursor, which presents as `node`. Claude keeps its own richer path in
  `focus-tmux.ts` (✳ upgraded to working by a busy shell or an owing
  transcript); Codex/Cursor come from `agentSparkForWindow`. A BLOCKED agent
  reports `waiting` there: that key has no amber to spend, and amber belongs to
  AI Project, which knows whose approval is wanted.
- **ONE colour language across the keys: blue = working, amber = waiting on YOU,
  white = idle.** The tmux key's Claude spark was amber-for-working, which meant
  the opposite of amber on the agent keys — two states demanding opposite actions
  sharing a colour on one deck. It is blue now. The two superseded per-agent keys
  keep the old scheme and die with it; don't "fix" them. RED is not a fourth
  state: it is AI Project's unread stripe, a LAYER over whatever state colour
  the key already shows (`UNREAD_RED` in `agent-project.ts`). The operator asked
  for a full red ground and was talked into the stripe, because red-as-ground
  out-shouts amber — and amber means "blocked, needs you now", which is more
  urgent than "finished". Don't promote red to a state.
- **README figures are code-generated.** docs/tmux-live-keys.png and claude-spark.gif now
  regenerate together via `python3 scripts/make-tmux-figure.py` (tsx -> the REAL
  buildTmuxKeyImage -> inkscape -> magick); claude-project-keys.png and
  dial-strips.png are still ad-hoc. Regenerate whenever a key face changes, or the
  README silently lies — the spark figures did exactly that until the recolour.
- **Cursor CLI (`cursor-agent`) breaks three assumptions Codex taught us.** All
  measured against 2026.08.11-e8db854, all of them cost time here:
  (a) **`ps -o comm=` is TRUNCATED** to 16 chars for these processes (it returns
  `/Users/johnknox/`), so identity must be read from `args` — Codex's
  `basename(comm) === "codex"` gate does not port.
  (b) **Every session forks a long-lived `node .../index.js` worker child** that
  matches the same argv pattern AND shares the session's tty and chat store. Left
  in, one session looks like two and every key goes ambiguous-gray; filter any
  candidate whose ppid is also a candidate (`withoutWorkerChildren`).
  (c) **Transcript records are appended AFTER a tool runs, not when it is
  requested.** While Cursor holds on an approval prompt its transcript contains
  only the user's message — byte-identical to "still thinking". Tail SHAPE
  therefore cannot decide working-vs-blocked; only the explicit
  `{"type":"turn_ended","status":…}` terminator is trustworthy, and it means
  "the prompt is idle".
- **Cursor's blocked state is only visible on screen.** Nothing on disk separates
  "waiting for your approval" from "still thinking", so `cursor-project.ts`
  matches Cursor's approval block in `tmux capture-pane` output — which makes
  amber **tmux-only**, and it fails SAFE: unrecognised wording degrades to
  "working", never to a false "needs you".
- **Cursor's project-folder names are lossy — never derive one from a cwd.** A
  long path is truncated and given a hash suffix
  (`private-tmp-claude-501-Users-johnknox-code-switchbo-157e277`). Look transcripts
  up by the exact session UUID, enumerating `~/.cursor/projects/*` (`findTranscriptPath`).
- **A scan that reads `~/…` by default is untestable — inject the base path.** The
  first cursor-scan tests silently read the OPERATOR'S REAL `~/.cursor/projects`
  and passed/failed on live data; `scanCursorSnapshot(exec, projectsBase)` takes the
  root so fixtures stay hermetic. Same trap applies to any future home-dir probe.
- **Claude Code keeps its IDLE title while BLOCKED on you.** Measured on claude
  2.1.226: with "Do you want to proceed?" on screen the pane title still read
  `✳ Count bytes in note.txt file` — the ✳ waiting marker, not a braille spinner.
  So a blocked Claude arrives at the face logic as `waiting`, NOT `working`. Any
  "upgrade to blocked" rule copied from `decideCursorFace` (which gates on
  `working`, correct for Cursor) is therefore UNREACHABLE for Claude and the
  feature silently never fires. `decideAgentFace` upgrades from either state.
  An independent review caught this before it shipped; every listed test would
  still have passed.
- **Claude's approval prompt is not one string.** Bash approval reads
  "This command requires approval" + "Do you want to proceed?"; an EDIT approval
  reads "Do you want to make this edit to <file>?". A matcher keyed on the first
  misses every file edit. Both carry a numbered `1. Yes` list, which is the
  conjunct that keeps a bare "Do you want to…?" in scrolled output from matching.
  The folder-trust prompt ("Quick safety check: Is this a project you created…")
  deliberately does NOT match.
- **Three agents, three different notions of "blocked".** Codex records it in its
  own rollout log (authoritative, works in any terminal); Claude and Cursor only
  ever show it on screen (tmux-only scrape). `blockedEvidenceFor(kind, host)`
  encodes exactly that, and the docs must not imply one uniform guarantee.
- **RETIREMENT COMMITMENT (do not lose this).** Claude/Codex/Cursor Project are
  superseded by AI Project and are kept ONLY so nobody's configured key is
  orphaned without a release of warning. A future release must delete: the three
  actions + their manifest entries, `src/mac/deprecation.ts` and its three call
  sites, `ui/lib/deprecated.js`, the three PIs, and the three legacy key-face
  BUILDERS (`build{Claude,Codex,Cursor}ProjectKeyImage`) only. The MODULES
  themselves stay: `claude-scan`/`codex-scan`/`cursor-scan` do the detection AI
  Project relies on, `claude-project` still supplies `projectClaudeState` and the
  ps/lsof parsers, and `codex-project` still supplies `normalizeProjectPath` and
  `parseLsofEntries`. Deleting a whole file because its NAME matches a retired
  action would break the unified key — check the imports first.
- **Named pasteboards CANNOT be enumerated**, which decides the clipboard
  stash's design. A per-gesture unique name is unrecoverable if the plugin dies
  mid-gesture: that stash then holds a copy of the operator's clipboard until
  reboot with nothing able to find it. The stash therefore uses a FIXED name
  (`STASH_PASTEBOARD_NAME`) that `plugin.ts` releases at startup. Also:
  `clearContents` empties a named pasteboard but LEAKS the pasteboard itself —
  `releaseGlobally` is what gives it back.
- **You cannot move a pasteboard item between pasteboards.**
  `stash.writeObjects(general.pasteboardItems)` throws "Cannot write pasteboard
  item… already associated with another pasteboard", so every representation
  must be read with `dataForType` and rebuilt. Consequence for the threat
  model: the clipboard's bytes DO transit the osascript child's memory (they
  never reach Node, stdout, disk or a log), and a lazy promise cannot be
  preserved as a promise — it is materialised or the snapshot is abandoned.
- **Bridged ObjC numbers concatenate as strings in JXA.** `bytes += d.length`
  produced `02617516011`. Wrap every arithmetic use in `Number()`.
- **Clear the pasteboard LAST, never first.** Both `WRITE_SNIPPET_SCRIPT` and
  `RESTORE_SCRIPT` build and validate every item before `clearContents`, then
  clear+write in a 3-attempt retry. Clearing first means any later failure
  hands the operator an EMPTY clipboard — destroyed in order to report that we
  could not replace it. The rule for giving the stash back is the mirror of it:
  release only on positive evidence the clipboard is intact (a parsed result
  proving restored / abandoned / failed-before-the-clear). A non-zero exit, a
  thrown runner error and an unrecognised result all KEEP the stash, because a
  timeout can land after the clear.
- **Nothing reports when an app has READ the pasteboard,** so restoring the
  clipboard after ⌘V is a timed guess. Measured with a scratch TextEdit
  document and a controlled swap: at 0ms delay the app pasted the swapped-in
  value every time; from 25ms up it pasted the snippet every time, even at load
  average ~10. `RESTORE_AFTER_PASTE_MS` is 1200 — ~48x that — and restoration
  is a per-key setting because a remote session or a beachballed app can be
  slower than any fixed wait.
- **osascript appends its OWN newline** to whatever the script returns, so a
  script returning `"ok|<types>\n" + ""` arrives as `ok|<types>\n\n`. Framing
  parsers strip exactly one trailing newline — and TEST FIXTURES must include
  it, or an empty payload looks malformed instead of empty (this made a real
  data-loss bug look unreproducible).
- **A user-facing behaviour change lands in FOUR places,** three of them far
  from the code: the README bullet, `ui/<action>.html`, the manifest
  **`Tooltip`** (what Stream Deck shows in its action list), and the module
  header. The tooltip is the one everyone forgets — and it needs a full SD
  quit+relaunch to show. Edit manifest values by raw string replacement, not
  `json.dump`, which reformats the whole file.
- **Impasse artifacts: send whole files or `git diff`, never a `sed` line
  range.** A truncated extract produced a confident "this cannot compile"
  finding for code that compiles. Include the docs that live outside `src/`
  (`ui/*.html`, the manifest `Tooltip`) — a doc review that omits them misses
  real errors, because the reviewer can only see what you send.
- **A tmux window NAME is not an identity.** Agents' windows auto-name
  themselves (`claude` twice in one session is normal), and `resolveTarget`
  takes the FIRST match, so a `session:name` key captured from the second one
  lit and raised the first. Index is no fix either: the operator's tmux.conf
  sets `renumber-windows on`, so every close shifts the indexes above it.
  Focus tmux binds a shared name by window id via `exactTargetFor` (capture
  and the dropdown both use it), and the press switches by id too. The id
  form is `session:@N#<server pid>`: a server never reuses an id, but a
  RESTARTED one numbers from @0 again (measured on a scratch server), so a
  bare `@8` would bind a stranger after every reboot. A pid mismatch reads
  as unresolved. `@digits` without `#pid` is still a NAME.
- **Verifying tmux syntax:** use a scratch session (`tmux new-session -d -s __sdtest` …
  `kill-session -t __sdtest`) — never experiment on live sessions.
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
- **Icons come from ONE generator** — `scripts/make-icons.py` renders every key
  face and list icon (20/40/72/144 via inkscape) from a shared token system:
  ink ground #0F1211 (matches the live key faces), 3px strokes on a 72 grid,
  family colours (phosphor=tmux, azure=windows/apps/web, amber=BBEdit,
  teal=files), and the "jack-line" strip at each key's foot. Add new actions by
  adding a glyph fn there — don't hand-draw one-off icons. Live faces
  (tmux-key.ts, window-ring.ts, key-image.ts) use the same tokens in hex.
- **List icons and the category icon are white-only on transparent** (Elgato
  guideline); key faces keep colour. `mono()` in `make-icons.py` rewrites strokes
  and fills to white and RAISES on INK. Glyphs that use INK as a knock-out
  (tmux, App Windows, Window Ring) and Switch App (a light arrow on a filled
  shape) need an explicit variant in `MONO_VARIANTS`. `tests/icons.test.ts`
  checks every visible pixel is #FFFFFF.
- **Node 24 needs `Software.MinimumVersion` "7.1".** The manifest schema pins
  Node 20 below it (measured: `Nodejs.Version failed validation for keyword:
  const`). Stream Deck downloads the runtime on first launch. `Debug` must not
  ship (it launches the plugin with `--inspect`). The live check
  (`node-24-live`) passed on 2026-10-05 on SD 7.6.0: Stream Deck fetched
  Node 24.13.1 into `NodeJS/` on relaunch, and the plugin ran on it with no
  `--inspect`. It ran on 7.6 only; 7.1-7.5 rest on Elgato's schema.
- **Multi-actions.** Encoders are never steps. A key step gets keyDown and keyUp
  as one gesture, so `PressGate` never fires and hold-to-capture does not exist.
  The step's face is never drawn. `SupportedInMultiActions` is `true` for Safari
  Tab Jump, Open / Switch App, Focus tmux Window, Open File and Paste Snippet,
  and `false` for the other eleven (six dials, Window Ring, AI Project, the three
  legacy agent keys). Live check (`multi-action-live`) passed on 2026-10-08:
  the multi-action picker listed exactly those five.
- **sdpi-components is bundled** in `ui/lib/sdpi-components.js` (v4.0.1, MIT, with
  Lit under BSD 3-Clause) and the notices ship in `ui/lib/THIRD-PARTY-LICENSES.md`.
  Update by replacing the file with a new pinned release, never by editing it.
  Pages load it as `lib/sdpi-components.js`, so settings screens render offline.
  Live check (`sdpi-bundle-live`) passed on 2026-10-08: settings screens
  rendered with the network off.
- **Dial failures go through `src/mac/dial-outcome.ts` + `reportDial`**
  (`src/actions/dial-report.ts`): one log line and one `showAlert` per gesture whose
  helper, AppleScript, terminal probe or tmux command fails. A rejected
  `setSettings` (mode/scope toggles) is NOT routed through it. Deliberate no-ops stay silent: a tmux dial with iTerm2 not frontmost,
  and every repaint-only path (BBEdit's `onWillAppear` never alerts).
- **SDK 3.x upgrade is deferred.** `@elgato/streamdeck` stays on 1.4.1. 3.x
  removes `streamDeck.ui.current`, changes `onDidReceiveSettings` semantics and
  makes the `DialAction`/`KeyAction` settings generics mandatory. See TODO.md.
- **`fresh` is not `invalidate`.** The three agent scanners (`claude-scan.ts`,
  `codex-scan.ts`, `cursor-scan.ts`) each take a `{ fresh: true }` option
  instead of the older pattern of calling an `invalidateXScan()` before the
  scan (removed from `agent-scan.ts`'s `invalidateAgentScans`, which used to
  exist for exactly that). `fresh` asks the machine now for THIS caller,
  without wiping the shared cache out from under every other poller reading it
  concurrently — an explicit invalidate is a global reset, `fresh` is a local
  ask. Publishing to the shared cache is guarded by a monotonic START-sequence
  counter (`seq`/`publishedSeq` in each scanner), not a wall-clock timestamp:
  the exact guarantee is "a scan that STARTED earlier can never overwrite the
  result of one that started later" — it does NOT mean the cache holds the
  single latest possible observation of the world, since a long scan that
  started later still wins even if a faster, earlier one finishes after it.
  Claude's cwd memo (`CWD_TTL_MS`, separate from the 2s world-cache TTL) is a
  second cache `fresh` has to bypass too — an earlier cut of this that only
  cleared the world cache left a "fresh" press acting on a cwd observed up to
  60s ago.

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

Short version — see that command for the exact, ordered steps. Session-learned traps:
- `gh release create` makes the tag REMOTELY only — run `git fetch --tags`
  before any `git log vX.Y.Z..HEAD` delta check, or it fails "unknown revision".
- Before picking the version, check `git log vLAST..HEAD --oneline` — an unreleased
  `feat:` in the delta makes it a MINOR, whatever prompted the release.
- `npm run pack` rewrites manifest.json WITHOUT its trailing newline — after packing,
  `git checkout -- com.movingavg.switchboard.sdPlugin/manifest.json`.
- Every `npm run build` drops plugin.js's executable bit: commit with
  `git add -A && git update-index --chmod=+x com.movingavg.switchboard.sdPlugin/bin/plugin.js`.

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

Installed buttons' ACTUAL settings (targets, titles) live in the profile store:
`~/Library/Application Support/com.elgato.StreamDeck/ProfilesV3/<id>.sdProfile/Profiles/<id>/manifest.json`
— read it to diagnose what a key is really configured to do (quit Stream Deck
before ever EDITING it).

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
