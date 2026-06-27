# Switchboard

*An operator's control surface for macOS — routing your attention across tabs, windows, panes, apps, documents, and files from a Stream Deck.*

---

## The story

I'm not an engineer. I'm a technology-alignment advisor to MedTech and SaaS CEOs — the person in the director's chair, not the IDE. Switchboard exists because I directed an AI agent (Claude) to build it: I specified what I wanted, steered the design, reviewed the work, and insisted on tests at every step. Working that way, a non-engineer shipped a working, tested tool in an afternoon.

That's the point. Switchboard is a **Moving Average Labs** artifact — a small, concrete proof of how AI changes the way operators build. The lesson isn't the tmux dials; it's the operating model behind them.

Read the full story in the flagship essay → [essay](https://movingavg.com/<slug>) *(link TBD)*. Advisory work lives at [movingavg.com](https://movingavg.com).

---

## What it does

Nine actions, grouped by what they route your attention to.

**Safari**
- **Jump to Tab** *(key)* — jump to an open Safari tab, or open it if it isn't there yet. Built-in presets for multi-account Gmail and Google Calendar, plus custom sites and private-window targets.

**Windows & apps**
- **Open / Switch App** *(key)* — launch or switch to an app, optionally focusing a window whose title matches a pattern.
- **Cycle App Windows** *(dial)* — rotate through the windows of the frontmost application.

**tmux**
- **Focus tmux Window** *(key)* — raise the iTerm2 window for a tmux window, optionally switching to it.
- **Switch tmux Pane** *(dial)* — rotate to move between tmux panes; push to exit copy-mode and return to the prompt.
- **Cycle tmux Window** *(dial)* — rotate to cycle tmux windows; push for the last window. Shows the current window live on the touchscreen.

**BBEdit**
- **BBEdit Documents** *(dial)* — move between the open documents in BBEdit's front window.

**Files**
- **Open File** *(key)* — open the newest, latest, or pattern-matched file in a folder, with a live ✓/✗ status badge.

---

## Highlights worth a line

- The **Cycle tmux Window** dial draws dynamic touchscreen graphics — the current window name renders live on the encoder display.
- **Jump to Tab** matches Safari tabs by wildcard, so a tab finds its home even when the URL drifts.
- **Open File** shows a live ✓/✗ status badge right on the key — you can see at a glance whether the target exists.
- **Jump to Tab** ships multi-account Gmail and Calendar presets — pick the account number, and the URL and match pattern are built for you.

---

## Install (macOS, Stream Deck +)

Requires macOS 12+ and the Stream Deck app 6.5+.

```bash
# Option A — symlink the .sdPlugin folder into the Stream Deck plugins dir
ln -s "$(pwd)/com.johnknox.safarijump.sdPlugin" \
  ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/

# Option B — use the Elgato CLI
npx @elgato/cli link
npx @elgato/cli restart com.johnknox.safarijump
```

Then restart the Stream Deck app.

---

## Permissions

Switchboard sends keystrokes and drives other apps, so macOS asks for two grants on first use:

- **Accessibility** — for keystrokes, scrolling, and window cycling.
  System Settings → Privacy & Security → Accessibility → enable Stream Deck.
- **Automation** — for driving Safari, iTerm2, and BBEdit.
  System Settings → Privacy & Security → Automation → enable Stream Deck for the target apps.

If a grant is denied, the key shows an alert and the plugin log spells out the exact re-enable path instead of failing silently.

---

## Status

**Personal project, shared as-is — not supported.** Built for my own machine and published as a proof artifact, not a product. No issue tracker, no roadmap, no guarantees. Use it, fork it, learn from it.

Licensed under MIT.

---

## Built with

Elgato Stream Deck SDK v2 · TypeScript / Node · ~182 passing tests · `streamdeck validate` runs in the build.

```bash
npm install
npm run build      # bundles to com.johnknox.safarijump.sdPlugin/bin/plugin.js
npm test           # vitest
npm run typecheck
```

> The plugin UUID is still `com.johnknox.safarijump` (kept so existing buttons survive); the public name is **Switchboard**.
