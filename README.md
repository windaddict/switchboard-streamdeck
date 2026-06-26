# Safari Jump — Stream Deck plugin

Jump to (or open) a Safari tab from a Stream Deck key. Built-in presets for
multi-account **Gmail** and **Google Calendar**, plus **custom websites** and
**private-window** targets.

## Why this exists

Replaces a third-party plugin whose custom targets silently disappeared. Root
cause there: a shared `customTargets` array written by two competing code paths,
where a stale snapshot clobbered the array on every selection. This plugin
sidesteps that entire class of bug — **settings are per-key**, so there is no
shared list and no selector to dangle.

## Design

| File | Responsibility | Tested |
|------|----------------|--------|
| `src/safari/targets.ts` | Resolve settings → `{url, urlPattern, private}` (multi-account / preset logic) | ✅ pure |
| `src/safari/applescript.ts` | Build injection-safe AppleScript | ✅ pure |
| `src/safari/runner.ts` | Run `osascript`, classify TCC denial vs. error | ✅ (mocked exec) |
| `src/actions/jump-to-tab.ts` | Stream Deck action glue | — |
| `ui/jump-to-tab.html` | Property inspector (single-writer settings) | — |

### Target resolution

- **Gmail** → `https://mail.google.com/mail/u/{N}/`, match `mail.google.com/mail/u/{N}`
- **Calendar** → `https://calendar.google.com/calendar/u/{N}/r`, match `calendar.google.com/calendar/u/{N}`
- **Custom** → your URL; match pattern defaults to host+path
- Matching: URL substring first, optional `Title contains` fallback (`||` = alternates)

### Private windows

Safari hides private-window tabs from AppleScript, so existing private tabs
**cannot** be matched. Private targets therefore always open a **fresh private
window** (`⌘⇧N` via System Events, then set the URL). This needs Automation
access for **System Events** in addition to **Safari**.

## Develop

```bash
npm install
npm run build      # bundles to com.johnknox.safarijump.sdPlugin/bin/plugin.js
npm test           # vitest
npm run typecheck
```

## Install into Stream Deck (manual, opt-in)

```bash
# Option A: symlink the .sdPlugin folder into the Stream Deck plugins dir, then
# restart the Stream Deck app.
ln -s "$(pwd)/com.johnknox.safarijump.sdPlugin" \
  ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/

# Option B: use the Elgato CLI
npx @elgato/cli link
npx @elgato/cli restart com.johnknox.safarijump
```

On first key press macOS will prompt for Automation access to Safari (and
System Events for private windows). If denied, the key shows an alert and the
plugin log explains how to re-enable it under
System Settings → Privacy & Security → Automation.

## Permissions gotcha

A denied Apple Event surfaces as osascript error **-1743**. `runner.ts`
classifies that as `permission-denied` and the action logs the exact re-enable
path instead of failing silently.
