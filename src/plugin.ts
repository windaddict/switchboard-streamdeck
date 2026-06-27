import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { CycleAppWindows } from "./actions/app-windows-dial.js";
import { BBEditDocDial } from "./actions/bbedit-doc-dial.js";
import { FocusTmuxWindow } from "./actions/focus-tmux.js";
import { JumpToTab } from "./actions/jump-to-tab.js";
import { OpenFile } from "./actions/open-file.js";
import { ScrollWindow } from "./actions/scroll-dial.js";
import { SwitchApp } from "./actions/switch-app.js";
import { CycleTmuxWindow } from "./actions/tmux-window-dial.js";
import { TmuxPaneDial } from "./actions/tmux-pane-dial.js";
import { WindowRing } from "./actions/window-ring.js";

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new JumpToTab());
streamDeck.actions.registerAction(new ScrollWindow());
streamDeck.actions.registerAction(new SwitchApp());
streamDeck.actions.registerAction(new FocusTmuxWindow());
streamDeck.actions.registerAction(new TmuxPaneDial());
streamDeck.actions.registerAction(new CycleTmuxWindow());
streamDeck.actions.registerAction(new CycleAppWindows());
streamDeck.actions.registerAction(new BBEditDocDial());
streamDeck.actions.registerAction(new OpenFile());
streamDeck.actions.registerAction(new WindowRing());

streamDeck.connect();
