import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { JumpToTab } from "./actions/jump-to-tab.js";

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new JumpToTab());

streamDeck.connect();
