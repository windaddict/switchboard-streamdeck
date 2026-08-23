import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { CycleAppWindows } from "./actions/app-windows-dial.js";
import { ClaudeProject } from "./actions/claude-project.js";
import { CodexProject } from "./actions/codex-project.js";
import { AiProject } from "./actions/ai-project.js";
import { CursorProject } from "./actions/cursor-project.js";
import { BBEditDocDial } from "./actions/bbedit-doc-dial.js";
import { FocusTmuxWindow } from "./actions/focus-tmux.js";
import { JumpToTab } from "./actions/jump-to-tab.js";
import { OpenFile } from "./actions/open-file.js";
import { PasteSnippet } from "./actions/paste-snippet.js";
import { ScrollWindow } from "./actions/scroll-dial.js";
import { SwitchApp } from "./actions/switch-app.js";
import { runJxaWithArgs } from "./applescript/runner.js";
import { CLIPBOARD_LANE, releaseStash } from "./mac/pasteboard-stash.js";
import { serialize } from "./mac/serialize.js";
import { ArrangeWindow } from "./actions/tile-dial.js";
import { CycleTmuxWindow } from "./actions/tmux-window-dial.js";
import { TmuxPaneDial } from "./actions/tmux-pane-dial.js";
import { WindowRing } from "./actions/window-ring.js";

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new JumpToTab());
streamDeck.actions.registerAction(new ClaudeProject());
streamDeck.actions.registerAction(new CodexProject());
streamDeck.actions.registerAction(new CursorProject());
streamDeck.actions.registerAction(new AiProject());
streamDeck.actions.registerAction(new ScrollWindow());
streamDeck.actions.registerAction(new SwitchApp());
streamDeck.actions.registerAction(new FocusTmuxWindow());
streamDeck.actions.registerAction(new TmuxPaneDial());
streamDeck.actions.registerAction(new CycleTmuxWindow());
streamDeck.actions.registerAction(new CycleAppWindows());
streamDeck.actions.registerAction(new BBEditDocDial());
streamDeck.actions.registerAction(new OpenFile());
streamDeck.actions.registerAction(new WindowRing());
streamDeck.actions.registerAction(new PasteSnippet());
streamDeck.actions.registerAction(new ArrangeWindow());

// Paste Snippet stashes the operator's clipboard in a named pasteboard while a
// gesture runs, and releases it afterwards. A run that was killed mid-gesture
// cannot do that, so the stash would sit in the pasteboard server holding a
// copy of their clipboard until reboot — macOS offers no way to enumerate
// named pasteboards, so this fixed-name release at startup is the ONLY thing
// that can ever clean it up. Safe when there is nothing to release.
// Runs in the SAME lane as the gestures, so the first press queues behind it
// instead of racing it — this cleanup clears and releases the very pasteboard a
// gesture would be using.
void serialize(CLIPBOARD_LANE, () =>
	releaseStash({ runJxaWithArgs, log: (message) => streamDeck.logger.info(`Paste Snippet: ${message}`) }),
);

streamDeck.connect();
