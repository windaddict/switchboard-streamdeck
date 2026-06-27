import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { JumpToTab } from "./actions/jump-to-tab.js";
import { ScrollWindow } from "./actions/scroll-dial.js";
import { SwitchApp } from "./actions/switch-app.js";

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new JumpToTab());
streamDeck.actions.registerAction(new ScrollWindow());
streamDeck.actions.registerAction(new SwitchApp());

streamDeck.connect();
