import streamDeck, { action, SingletonAction, LogLevel } from '@elgato/streamdeck';
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
}
function __runInitializers(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
}
typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * Thin osascript runner, shared by all actions. The `exec` dependency is
 * injectable so tests can mock it without spawning processes. Error
 * classification distinguishes the two macOS privacy denials we can hit —
 * Automation (Apple Events) and Accessibility (assistive/keystroke) — from a
 * generic failure, so each action can guide the user to the right setting.
 */
/**
 * Classify osascript stderr. macOS reports blocked automation with error
 * -1743 ("Not authorized to send Apple events"); blocked keystroke/assistive
 * access (Accessibility) with -1719 ("not allowed assistive access"); -10004
 * can also appear when a target app isn't reachable under sandboxed automation.
 */
function classifyError(stderr) {
    if (/-1743|-1719|-10004|not authori[sz]ed to send apple events|not allowed assistive/i.test(stderr)) {
        return "permission-denied";
    }
    return "error";
}
function runAppleScript(script, exec = execFile) {
    return new Promise((resolve) => {
        exec("/usr/bin/osascript", ["-e", script], { timeout: 8000 }, (error, stdout, stderr) => {
            const out = String(stdout ?? "");
            const err = String(stderr ?? "");
            if (error) {
                resolve({ ok: false, code: classifyError(err || String(error)), stdout: out, stderr: err });
            }
            else {
                resolve({ ok: true, code: "success", stdout: out, stderr: err });
            }
        });
    });
}

/**
 * Pure logic for the "cycle windows of the active application" dial. Uses the
 * macOS "Move focus to next window" shortcut (Cmd+`, grave = key code 50),
 * which cycles the frontmost app's windows — no app-specific scripting needed.
 */
/** AppleScript to cycle the frontmost app's windows forward/backward. */
function appWindowCycleScript(direction) {
    const modifiers = direction === "next" ? "{command down}" : "{command down, shift down}";
    return `tell application "System Events"
	key code 50 using ${modifiers}
end tell
return "ok"`;
}
/** AppleScript returning `appName|frontWindowTitle` for the frontmost app. */
const FRONT_WINDOW_SCRIPT = `tell application "System Events"
	set p to first application process whose frontmost is true
	set appName to name of p
	if (count of windows of p) is 0 then return appName & "|"
	return appName & "|" & (name of front window of p)
end tell`;
/** Parse `app|title` (title may contain further `|`, kept intact). */
function parseFrontWindow(output) {
    const out = output.trim();
    const i = out.indexOf("|");
    if (i < 0)
        return { app: out, title: "" };
    return { app: out.slice(0, i), title: out.slice(i + 1) };
}

/** Shared dial-rotation direction mapping. */
/** Map a dial rotation to a step: positive = next, negative = prev, 0 = none. */
function rotationDirection(ticks) {
    const t = Math.trunc(ticks);
    if (t > 0)
        return "next";
    if (t < 0)
        return "prev";
    return "none";
}

/**
 * Dial action: cycle the windows of the frontmost application using the macOS
 * "Move focus to next window" shortcut. The touchscreen shows the front app and
 * its current window title, refreshed after each step.
 */
let CycleAppWindows = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.appwindows" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.refresh(ev.action);
            }
        }
        async onDialRotate(ev) {
            const direction = rotationDirection(ev.payload.ticks);
            if (direction !== "none") {
                const result = await runAppleScript(appWindowCycleScript(direction));
                if (!result.ok && result.code === "permission-denied") {
                    streamDeck.logger.error("Window cycling blocked. Grant Accessibility: System Settings > Privacy & " +
                        "Security > Accessibility > enable Stream Deck.");
                }
            }
            await this.refresh(ev.action);
        }
        async refresh(dial) {
            const result = await runAppleScript(FRONT_WINDOW_SCRIPT);
            if (!result.ok)
                return;
            const { app, title } = parseFrontWindow(result.stdout);
            try {
                await dial.setFeedback({ title: app || "Windows", value: title || "—" });
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the BBEdit document dial: move between the text documents open
 * in BBEdit's front window, in a user-chosen traversal order. We cycle `text
 * documents` (not `documents`) so non-editor project/folder items that show
 * "(no editor)" are skipped.
 *
 * The ordering/selection is done here in TypeScript (testable): AppleScript
 * lists the docs with sort keys (`BBEDIT_LIST_SCRIPT`), this module orders them
 * and picks the target, then AppleScript selects it by its stable `id`
 * (`bbeditSelectScript`). Scripts interpolate only numeric ids, so there is
 * nothing to escape.
 */
/** AppleScript returning the front text window's active document name (or ""). */
const BBEDIT_CURRENT_DOC_SCRIPT = `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	return name of active document of text window 1
end tell`;
/**
 * AppleScript that lists the front window's text documents, one per line as
 * `id<tab>name<tab>modSeconds`, then a final `ACTIVE<tab>id` line for the active
 * document. Returns "" when there is no text window.
 */
const BBEDIT_LIST_SCRIPT = `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	set w to text window 1
	set theDocs to text documents of w
	set epoch to current date
	set day of epoch to 1
	set month of epoch to January
	set year of epoch to 1970
	set time of epoch to 0
	set out to ""
	repeat with d in theDocs
		set out to out & (id of d) & tab & (name of d) & tab & ((modification date of d) - epoch) & linefeed
	end repeat
	try
		set out to out & "ACTIVE" & tab & (id of active document of w)
	end try
	return out
end tell`;
/** Parse `BBEDIT_LIST_SCRIPT` output into docs + the active document id. */
function parseBBEditDocs(output) {
    const docs = [];
    let activeId = null;
    for (const line of output.split("\n")) {
        if (line.trim() === "")
            continue;
        const parts = line.split("\t");
        if (parts[0] === "ACTIVE") {
            const id = Number.parseInt(parts[1] ?? "", 10);
            activeId = Number.isFinite(id) ? id : null;
            continue;
        }
        if (parts.length < 3)
            continue;
        const id = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isFinite(id))
            continue;
        const modSeconds = Number(parts[parts.length - 1]);
        const name = parts.slice(1, parts.length - 1).join("\t");
        docs.push({ id, name, modSeconds: Number.isFinite(modSeconds) ? modSeconds : 0 });
    }
    return { docs, activeId };
}
/** Order the documents by the chosen traversal mode (window = natural order). */
function orderedDocs(docs, order) {
    const arr = [...docs];
    switch (order) {
        case "alpha":
            return arr.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
        case "recent":
            return arr.sort((a, b) => b.modSeconds - a.modSeconds || a.id - b.id);
        case "oldest":
            return arr.sort((a, b) => a.modSeconds - b.modSeconds || a.id - b.id);
        default:
            return arr;
    }
}
/**
 * Given docs already in traversal order, return the id of the next/previous
 * document relative to `activeId` (wrapping). If the active document isn't in
 * the set, jump to the first. Returns null only for an empty list.
 */
function nextDocId(ordered, activeId, direction) {
    const n = ordered.length;
    if (n === 0)
        return null;
    const idx = ordered.findIndex((d) => d.id === activeId);
    if (idx < 0)
        return ordered[0].id;
    const target = direction === "next" ? (idx + 1) % n : (idx - 1 + n) % n;
    return ordered[target].id;
}
/** AppleScript that selects the front window's text document with the given id. */
function bbeditSelectScript(id) {
    return `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	set w to text window 1
	try
		select (first text document of w whose id is ${id})
		return name of active document of w
	on error
		return ""
	end try
end tell`;
}

/**
 * Dial action: move between the text documents open in BBEdit's front window,
 * in the order chosen in the property inspector. The touchscreen shows the
 * active document name.
 */
let BBEditDocDial = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.bbeditdoc" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                const result = await runAppleScript(BBEDIT_CURRENT_DOC_SCRIPT);
                if (!result.ok) {
                    streamDeck.logger.warn(`BBEdit read failed (${result.code}): ${result.stderr || "no stderr"}`);
                }
                await this.render(ev.action, result.ok ? result.stdout : this.hint(result.code));
            }
        }
        async onDialRotate(ev) {
            const direction = rotationDirection(ev.payload.ticks);
            if (direction === "none")
                return;
            const list = await runAppleScript(BBEDIT_LIST_SCRIPT);
            if (!list.ok) {
                this.logFailure("list", list.code, list.stderr);
                await this.render(ev.action, this.hint(list.code));
                return;
            }
            const { docs, activeId } = parseBBEditDocs(list.stdout);
            const ordered = orderedDocs(docs, ev.payload.settings.order ?? "window");
            const targetId = nextDocId(ordered, activeId, direction);
            if (targetId === null) {
                await this.render(ev.action, "no docs");
                return;
            }
            const selected = await runAppleScript(bbeditSelectScript(targetId));
            if (!selected.ok) {
                this.logFailure("select", selected.code, selected.stderr);
                await this.render(ev.action, this.hint(selected.code));
                return;
            }
            await this.render(ev.action, selected.stdout);
        }
        async render(dial, docName) {
            try {
                await dial.setFeedback({ title: "BBEdit", value: docName.trim() || "—" });
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
        logFailure(stage, code, stderr) {
            streamDeck.logger.error(`BBEdit ${stage} failed (${code}): ${stderr || "no stderr"}`);
            if (code === "permission-denied") {
                streamDeck.logger.error("Grant: System Settings > Privacy & Security > Automation > Stream Deck > enable BBEdit.");
            }
        }
        hint(code) {
            return code === "permission-denied" ? "grant access" : "no BBEdit?";
        }
    });
    return _classThis;
})();

/** Escape a string for safe embedding inside an AppleScript double-quoted literal. */
function escapeForAppleScript(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Build AppleScript that activates iTerm and selects the window+tab+session
 * whose `tty` equals the given tty. The script returns "ok" if a match was
 * found and selected, otherwise "notfound".
 *
 * The tty is escaped via {@link escapeForAppleScript} before interpolation so
 * that quotes/backslashes in the value cannot break out of the AppleScript
 * string literal.
 *
 * iTerm2's AppleScript application name is "iTerm". Each iTerm2 session exposes
 * a `tty` property (e.g. "/dev/ttys000").
 *
 * @param tty - The tty device path to match (e.g. "/dev/ttys000").
 * @returns The AppleScript source, or "" when `tty` is empty/whitespace-only
 *          (the caller treats "" as nothing-to-do).
 */
function buildITermRaiseScript(tty) {
    if (tty.trim() === "") {
        return "";
    }
    const escapedTty = escapeForAppleScript(tty);
    return `tell application "iTerm"
	activate
	repeat with w in windows
		repeat with t in tabs of w
			repeat with s in sessions of t
				if (tty of s) is "${escapedTty}" then
					select w
					tell t to select
					tell s to select
					return "ok"
				end if
			end repeat
		end repeat
	end repeat
end tell
return "notfound"`;
}

/**
 * Pure parsing + target-resolution helpers for driving tmux from the plugin.
 *
 * None of these functions shell out — they take the raw stdout of tmux
 * commands as strings and return plain data, so they are fully unit-testable.
 */
/**
 * Parse the output of:
 *   tmux list-windows -a -F "#{session_name}|#{window_index}|#{window_name}|#{window_active}"
 *
 * Each non-blank line is split on `|` into exactly four fields:
 * `session | index | name | active`. `active` is `true` only for the literal
 * string `"1"`; anything else is `false`. `index` is parsed as a number.
 *
 * Blank lines and lines with fewer than four `|`-separated fields are skipped.
 * Window names never contain `|` (tmux uses it only as our separator here).
 */
function parseWindows(output) {
    const windows = [];
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line.length === 0) {
            continue;
        }
        const fields = line.split("|");
        if (fields.length < 4) {
            continue;
        }
        const [session, index, name, active] = fields;
        windows.push({
            session,
            index: Number(index),
            name,
            active: active === "1",
        });
    }
    return windows;
}
/**
 * Parse the output of:
 *   tmux list-clients -F "#{client_tty}|#{client_session}"
 *
 * Returns a map of session name → client tty. If a session appears on more
 * than one line, the FIRST occurrence wins. Blank and malformed lines (fewer
 * than two `|`-separated fields) are skipped.
 */
function parseClients(output) {
    const clients = new Map();
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line.length === 0) {
            continue;
        }
        const fields = line.split("|");
        if (fields.length < 2) {
            continue;
        }
        const [tty, session] = fields;
        if (!clients.has(session)) {
            clients.set(session, tty);
        }
    }
    return clients;
}
/**
 * Resolve a user-supplied target string to a single {@link TmuxWindow}.
 *
 * The target is trimmed first; an empty/whitespace-only target returns `null`.
 *
 * Two forms are supported:
 *
 * - `"session:name"` — the part before `:` must match a window's session
 *   exactly (case-insensitive) AND the part after must match the window's name
 *   exactly (case-insensitive). If the part after `:` is all digits, it ALSO
 *   matches when it equals the window's index.
 *
 * - `"name"` (no colon) — first try a case-insensitive EXACT name match across
 *   all windows; if none, fall back to a case-insensitive SUBSTRING match.
 *   Returns the first match in either pass.
 *
 * Returns `null` when nothing matches.
 */
function resolveTarget$1(windows, target) {
    const trimmed = target.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const colon = trimmed.indexOf(":");
    if (colon !== -1) {
        const sessionPart = trimmed.slice(0, colon).toLowerCase();
        const namePart = trimmed.slice(colon + 1);
        const namePartLower = namePart.toLowerCase();
        const isIndex = namePart.length > 0 && /^\d+$/.test(namePart);
        const indexValue = isIndex ? Number(namePart) : NaN;
        for (const w of windows) {
            if (w.session.toLowerCase() !== sessionPart) {
                continue;
            }
            if (w.name.toLowerCase() === namePartLower) {
                return w;
            }
            if (isIndex && w.index === indexValue) {
                return w;
            }
        }
        return null;
    }
    const targetLower = trimmed.toLowerCase();
    // Pass 1: exact (case-insensitive) name match.
    for (const w of windows) {
        if (w.name.toLowerCase() === targetLower) {
            return w;
        }
    }
    // Pass 2: substring (case-insensitive) name match.
    for (const w of windows) {
        if (w.name.toLowerCase().includes(targetLower)) {
            return w;
        }
    }
    return null;
}
/** The tmux args that select the given window: `select-window -t <session>:<index>`. */
function selectWindowArgs(w) {
    return ["select-window", "-t", `${w.session}:${w.index}`];
}
/** Human-readable dropdown label, e.g. `"dev: movingavg"`. */
function tmuxWindowLabel(w) {
    return `${w.session}: ${w.name}`;
}
/** Stable dropdown/target value, e.g. `"dev:movingavg"`. */
function tmuxWindowValue(w) {
    return `${w.session}:${w.name}`;
}

/**
 * Spawns the tmux CLI. Stream Deck launches plugins with a minimal PATH that
 * usually lacks Homebrew, so we resolve an absolute tmux path. `exec`/`exists`
 * are injectable for tests.
 */
const TMUX_CANDIDATES = ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"];
/** First tmux binary that exists, falling back to bare "tmux" (PATH lookup). */
function findTmuxPath(exists = existsSync) {
    return TMUX_CANDIDATES.find(exists) ?? "tmux";
}
/** tmux args that emit one window per line as `session|index|name|active`. */
const LIST_WINDOWS_ARGS = [
    "list-windows",
    "-a",
    "-F",
    "#{session_name}|#{window_index}|#{window_name}|#{window_active}",
];
/** tmux args that emit one client per line as `tty|session`. */
const LIST_CLIENTS_ARGS = ["list-clients", "-F", "#{client_tty}|#{client_session}"];
/** Run tmux with the given args and capture stdout/stderr. */
function runTmux(args, tmuxPath, exec = execFile) {
    return new Promise((resolve) => {
        exec(tmuxPath, args, { timeout: 5000 }, (error, stdout, stderr) => {
            resolve({
                ok: !error,
                stdout: String(stdout ?? ""),
                stderr: String(stderr ?? ""),
            });
        });
    });
}

/**
 * Raise the iTerm2 window hosting a tmux session (matched by one of its window
 * names) and optionally switch tmux to that window. The dropdown is populated
 * live from `tmux list-windows`; the target is re-resolved at press time so it
 * survives tmux layout changes.
 */
let FocusTmuxWindow = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.tmux" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onKeyDown(ev) {
            const target = (ev.payload.settings.target ?? "").trim();
            if (!target) {
                streamDeck.logger.warn("Focus tmux Window pressed with no target selected.");
                await ev.action.showAlert();
                return;
            }
            const tmux = findTmuxPath();
            const windowsResult = await runTmux(LIST_WINDOWS_ARGS, tmux);
            if (!windowsResult.ok) {
                streamDeck.logger.error(`tmux list-windows failed: ${windowsResult.stderr || "no server?"}`);
                await ev.action.showAlert();
                return;
            }
            const match = resolveTarget$1(parseWindows(windowsResult.stdout), target);
            if (!match) {
                streamDeck.logger.warn(`No tmux window matched "${target}".`);
                await ev.action.showAlert();
                return;
            }
            // Map the session to the iTerm2 window via its attached client tty.
            const clientsResult = await runTmux(LIST_CLIENTS_ARGS, tmux);
            const tty = parseClients(clientsResult.stdout).get(match.session);
            const raiseScript = tty ? buildITermRaiseScript(tty) : 'tell application "iTerm" to activate';
            const raise = await runAppleScript(raiseScript);
            if (!raise.ok) {
                streamDeck.logger.error(`iTerm raise failed (${raise.code}): ${raise.stderr}`);
            }
            else if (raise.stdout.includes("notfound")) {
                streamDeck.logger.debug(`No iTerm session on tty ${tty ?? "?"}; activated iTerm only.`);
            }
            // Optionally switch tmux to the exact window (default on).
            if (ev.payload.settings.switchWindow !== false) {
                await runTmux(selectWindowArgs(match), tmux);
            }
            await ev.action.showOk();
        }
        /** Serve the live list of tmux windows to the property inspector dropdown. */
        async onSendToPlugin(ev) {
            const payload = ev.payload;
            if (payload?.event !== "getTmuxWindows")
                return;
            const tmux = findTmuxPath();
            const result = await runTmux(LIST_WINDOWS_ARGS, tmux);
            const items = parseWindows(result.stdout).map((w) => ({
                label: tmuxWindowLabel(w),
                value: tmuxWindowValue(w),
            }));
            await streamDeck.ui.current?.sendToPropertyInspector({ event: "getTmuxWindows", items });
        }
    });
    return _classThis;
})();

/**
 * AppleScript generation. Pure string-building so it can be unit-tested without
 * actually invoking osascript. All user-controlled values are escaped before
 * interpolation to avoid AppleScript injection.
 */
/** Build a title-match clause from a `||`-separated pattern list. */
function titleClause(titlePattern) {
    if (!titlePattern)
        return "";
    const parts = titlePattern
        .split("||")
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length === 0)
        return "";
    const ors = parts.map((p) => `(theName contains "${escapeForAppleScript(p)}")`).join(" or ");
    return ` or ${ors}`;
}
/**
 * Split a URL match pattern into ordered literal segments on `*` wildcards.
 *
 * A pattern with no `*` yields a single segment, which matches as a plain
 * substring (so existing non-wildcard patterns are unchanged). `*` stands for
 * any run of characters; matching requires the segments to appear in order but
 * is not anchored (it still matches anywhere in the URL).
 *
 * Examples: `"a/b"` -> `["a/b"]`; `"mail.google.com/u/*​/inbox"` ->
 * `["mail.google.com/u/", "/inbox"]`; `"*"` / `""` -> `[]` (matches anything).
 */
function wildcardSegments(pattern) {
    return pattern.split("*").filter((segment) => segment.length > 0);
}
/** Render segments as an AppleScript list literal of escaped strings. */
function segmentsListLiteral(segments) {
    return `{${segments.map((s) => `"${escapeForAppleScript(s)}"`).join(", ")}}`;
}
/**
 * Find an existing Safari tab matching the URL pattern (or title fallback),
 * focus it, and raise its window. If none is found, open the URL. The URL match
 * supports `*` wildcards via an ordered-segment containment check.
 */
function buildNormalScript(t) {
    const url = escapeForAppleScript(t.url);
    const segs = segmentsListLiteral(wildcardSegments(t.urlPattern));
    const titleMatch = titleClause(t.titlePattern);
    return `on urlMatches(u)
	set segs to ${segs}
	set startIdx to 1
	set uLen to (length of u)
	repeat with seg in segs
		set s to (seg as text)
		if s is not "" then
			if startIdx > uLen then return false
			set f to offset of s in (text startIdx thru uLen of u)
			if f is 0 then return false
			set startIdx to startIdx + f + (length of s) - 1
		end if
	end repeat
	return true
end urlMatches

tell application "Safari"
	set wasFound to false
	repeat with w in windows
		repeat with tb in tabs of w
			try
				set theURL to URL of tb
			on error
				set theURL to ""
			end try
			try
				set theName to name of tb
			on error
				set theName to ""
			end try
			if (my urlMatches(theURL))${titleMatch} then
				set current tab of w to tb
				set index of w to 1
				set wasFound to true
				exit repeat
			end if
		end repeat
		if wasFound then exit repeat
	end repeat
	if not wasFound then
		open location "${url}"
	end if
	activate
end tell
return "ok"`;
}
/**
 * Open the URL in a NEW private window. Safari does not expose private-window
 * tabs to AppleScript, so matching an existing private tab is not possible —
 * we always open fresh. Uses the ⌘⇧N menu shortcut via System Events.
 */
function buildPrivateScript(t) {
    const url = escapeForAppleScript(t.url);
    return `tell application "Safari" to activate
delay 0.2
tell application "System Events"
	keystroke "n" using {command down, shift down}
end tell
delay 0.4
tell application "Safari"
	set URL of front document to "${url}"
	activate
end tell
return "ok"`;
}
/** Build the AppleScript for a resolved target (private or normal). */
function buildJumpScript(t) {
    return t.private ? buildPrivateScript(t) : buildNormalScript(t);
}

/**
 * Target resolution: turn per-button settings into a concrete URL + match
 * pattern. This is the multi-account / preset logic and is intentionally pure
 * (no Stream Deck, no Safari) so it is fully unit-testable.
 */
/** Coerce an account index into a non-negative integer, defaulting to 0. */
function normalizeIndex(value) {
    const n = typeof value === "string" ? Number.parseInt(value, 10) : value;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
/** Derive a sensible match pattern (host + path) from a full URL. */
function derivePattern(url) {
    try {
        const u = new URL(url);
        return (u.host + u.pathname).replace(/\/+$/, "");
    }
    catch {
        return url.trim();
    }
}
function resolveTarget(settings) {
    const isPrivate = settings.private === true;
    const idx = normalizeIndex(settings.accountIndex);
    const titlePattern = settings.titlePattern?.trim() || undefined;
    // The PI's `service` dropdown only persists once actively changed, so a
    // button left on the default Gmail option saves no `service` at all. Infer
    // it: a bare URL implies a custom target, otherwise default to Gmail.
    const service = settings.service ?? (settings.url?.trim() ? "custom" : "gmail");
    switch (service) {
        case "gmail":
            return {
                url: `https://mail.google.com/mail/u/${idx}/`,
                urlPattern: `mail.google.com/mail/u/${idx}`,
                titlePattern,
                private: isPrivate,
            };
        case "calendar":
            return {
                url: `https://calendar.google.com/calendar/u/${idx}/r`,
                urlPattern: `calendar.google.com/calendar/u/${idx}`,
                titlePattern,
                private: isPrivate,
            };
        case "custom":
        default: {
            const url = (settings.url ?? "").trim();
            return {
                url,
                urlPattern: settings.urlPattern?.trim() || derivePattern(url),
                titlePattern,
                private: isPrivate,
            };
        }
    }
}

/**
 * Jump to (or open) a Safari tab. Settings are per-key, so there is no shared
 * target list to clobber — each button owns its own target.
 */
let JumpToTab = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.jump" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onKeyDown(ev) {
            const target = resolveTarget(ev.payload.settings ?? {});
            if (!target.url) {
                streamDeck.logger.warn("Jump to Tab pressed with no URL configured.");
                await ev.action.showAlert();
                return;
            }
            const result = await runAppleScript(buildJumpScript(target));
            if (result.ok) {
                await ev.action.showOk();
                return;
            }
            await ev.action.showAlert();
            if (result.code === "permission-denied") {
                streamDeck.logger.error("Safari automation blocked. Grant access: System Settings > Privacy & Security > " +
                    "Automation > Stream Deck > enable Safari (and System Events for private windows).");
            }
            else {
                streamDeck.logger.error(`Jump to Tab failed: ${result.stderr || "unknown error"}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the "Open File" action: glob matching, picking a file from a
 * directory listing by a strategy, and building `open` arguments. The actual
 * filesystem read and process launch live in the action; everything here is
 * pure and unit-testable.
 */
/**
 * Expand a leading `~` to the home directory. Node's fs does not understand
 * `~` (it's a shell convenience), so a directory like "~/Downloads" must be
 * resolved before use. Non-tilde paths are returned unchanged.
 */
function expandHome(p, home) {
    if (p === "~")
        return home;
    if (p.startsWith("~/"))
        return `${home}${p.slice(1)}`;
    return p;
}
/**
 * Convert a filename glob (`*` = any run, `?` = one char) into an anchored,
 * case-insensitive RegExp. All other regex metacharacters are matched literally.
 */
function globToRegExp(glob) {
    const specials = /[.+^${}()|[\]\\]/;
    let body = "";
    for (const ch of glob) {
        if (ch === "*")
            body += ".*";
        else if (ch === "?")
            body += ".";
        else
            body += specials.test(ch) ? `\\${ch}` : ch;
    }
    return new RegExp(`^${body}$`, "i");
}
/**
 * Pick one file from `entries` matching `pattern`, by `mode`:
 *   - "modified": most recently modified (mtime)
 *   - "created":  most recently created (birthtime)
 *   - "name":     last in descending name order (handy for date-named files)
 * Returns null when nothing matches.
 */
function selectFile(entries, pattern, mode) {
    const re = globToRegExp(pattern.trim() || "*");
    const matches = entries.filter((e) => re.test(e.name));
    if (matches.length === 0)
        return null;
    const compare = mode === "created"
        ? (a, b) => b.birthtimeMs - a.birthtimeMs
        : mode === "name"
            ? (a, b) => b.name.localeCompare(a.name)
            : (a, b) => b.mtimeMs - a.mtimeMs;
    return [...matches].sort(compare)[0] ?? null;
}
/**
 * Build `open` CLI args for the chosen file. Default app: `open <file>`;
 * BBEdit: `open -a BBEdit <file>`; a named/path app: `open -a <app> <file>`.
 * Falls back to the default app when "app" is selected but none is provided.
 */
function buildOpenArgs(filePath, opener, app) {
    if (opener === "bbedit")
        return ["-a", "BBEdit", filePath];
    if (opener === "app" && app && app.trim() !== "")
        return ["-a", app.trim(), filePath];
    return [filePath];
}

/**
 * Builds the Open File key image as an SVG: a document glyph with an optional
 * status badge — a green check when a matching file exists, a red X when none
 * does. Pure and unit-testable; the action turns it into a data URI for
 * setImage.
 */
/** Encode an SVG string as a data URI usable by Stream Deck setImage. */
function svgToDataUri$1(svg) {
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
function badge(status) {
    if (status === "match") {
        return (`<circle cx="53" cy="53" r="14" fill="#2ecc71" stroke="#1d1d1f" stroke-width="2"/>` +
            `<path d="M46 53l5 5 9-10" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    if (status === "none") {
        return (`<circle cx="53" cy="53" r="14" fill="#e74c3c" stroke="#1d1d1f" stroke-width="2"/>` +
            `<path d="M48 48l10 10M58 48l-10 10" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`);
    }
    return "";
}
/** Build the 72×72 Open File key image SVG for the given status. */
function buildOpenFileImage(status) {
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="#1d1d1f"/>` +
        `<rect x="16" y="12" width="32" height="42" rx="4" fill="#2b2b2e" stroke="#8ab4ff" stroke-width="2"/>` +
        `<path d="M22 22h20M22 29h20M22 36h13" stroke="#8ab4ff" stroke-width="2.5" stroke-linecap="round"/>` +
        badge(status) +
        `</svg>`);
}

/** How often the status badge re-checks the directory (ms). */
const POLL_MS$1 = 10_000;
/**
 * Open the newest / latest-modified / pattern-matched file in a directory with
 * the default app, BBEdit, or a chosen app. When the status indicator is on,
 * the key shows a ✓ when a matching file exists or a ✗ when none does, polled
 * live so it reflects new files without a press.
 */
let OpenFile = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.openfile" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        visible = new Map();
        timer;
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => void this.refreshAll(), POLL_MS$1);
            }
            await this.updateStatus(ev.action, ev.payload.settings);
        }
        onWillDisappear(ev) {
            this.visible.delete(ev.action.id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        async onDidReceiveSettings(ev) {
            if (ev.action.isKey()) {
                await this.updateStatus(ev.action, ev.payload.settings);
            }
        }
        async onKeyDown(ev) {
            const settings = ev.payload.settings;
            const dir = expandHome((settings.directory ?? "").trim(), homedir());
            if (!dir) {
                streamDeck.logger.warn("Open File pressed with no directory configured.");
                await ev.action.showAlert();
                return;
            }
            const entries = this.list(dir);
            if (entries === null) {
                streamDeck.logger.error(`Open File: cannot read directory "${dir}".`);
                await ev.action.showAlert();
                return;
            }
            const chosen = selectFile(entries, settings.pattern ?? "*", settings.pick ?? "modified");
            if (!chosen) {
                streamDeck.logger.warn(`Open File: no file matched "${settings.pattern ?? "*"}" in ${dir}.`);
                await ev.action.showAlert();
                await this.updateStatus(ev.action, settings);
                return;
            }
            const args = buildOpenArgs(join(dir, chosen.name), settings.openWith ?? "default", settings.app);
            const ok = await this.open(args);
            await (ok ? ev.action.showOk() : ev.action.showAlert());
            await this.updateStatus(ev.action, settings);
        }
        /** Read a directory into file entries with timestamps, or null on error. */
        list(dir) {
            try {
                return readdirSync(dir, { withFileTypes: true })
                    .filter((d) => d.isFile())
                    .map((d) => {
                    const st = statSync(join(dir, d.name));
                    return { name: d.name, mtimeMs: st.mtimeMs, birthtimeMs: st.birthtimeMs };
                });
            }
            catch {
                return null;
            }
        }
        open(args) {
            return new Promise((resolve) => {
                execFile("/usr/bin/open", args, (err) => resolve(!err));
            });
        }
        async refreshAll() {
            for (const action of this.visible.values()) {
                const settings = await action.getSettings();
                await this.updateStatus(action, settings);
            }
        }
        /** Paint the ✓/✗ status badge (or reset to the plain icon when disabled). */
        async updateStatus(action, settings) {
            try {
                if (!settings.statusIndicator) {
                    await action.setImage();
                    return;
                }
                const dir = expandHome((settings.directory ?? "").trim(), homedir());
                let status = "none";
                if (dir) {
                    const entries = this.list(dir);
                    const hit = entries && selectFile(entries, settings.pattern ?? "*", settings.pick ?? "modified");
                    status = hit ? "match" : "none";
                }
                await action.setImage(svgToDataUri$1(buildOpenFileImage(status)));
            }
            catch (err) {
                streamDeck.logger.debug(`Open File status update skipped: ${String(err)}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the "scroll the frontmost window" Stream Deck dial.
 *
 * This module models a dial rotation as a {@link KeystrokePlan} and renders
 * that plan into an AppleScript string that drives macOS System Events. It is
 * intentionally free of any Stream Deck SDK dependency so it can be unit
 * tested in isolation.
 *
 * macOS virtual key codes used here:
 *   116 = Page Up, 121 = Page Down, 125 = Down arrow, 126 = Up arrow.
 */
/**
 * Coerce an arbitrary settings value into a usable lines-per-tick count.
 *
 * Rules: parse numbers and numeric strings, floor to an integer, and clamp to
 * a minimum of 1. Anything unparseable (including `undefined`) falls back to
 * the default of 3.
 *
 * Examples: `"5" -> 5`, `undefined -> 3`, `0 -> 1`, `-2 -> 1`, `2.9 -> 2`,
 * `"abc" -> 3`.
 */
function normalizeLinesPerTick(value) {
    const n = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Number(value)
            : NaN;
    if (!Number.isFinite(n))
        return 3;
    return Math.max(1, Math.floor(n));
}
/** Toggle between the two speeds. */
function nextSpeed(s) {
    return s === "fast" ? "slow" : "fast";
}
/** In "fast" mode each tick scrolls this many times the slow-mode line count. */
const FAST_MULTIPLIER = 5;
/**
 * Map a dial rotation to a signed scroll distance in lines, posted as a single
 * proportional scroll-wheel event by the native helper (not synthetic
 * keystrokes — those coalesce and never scale).
 *
 * Positive ticks scroll DOWN; negative ticks scroll UP. Ticks are truncated
 * toward zero. In "slow" mode a tick is `linesPerTick` lines; in "fast" mode it
 * is `linesPerTick * FAST_MULTIPLIER`. `linesPerTick` defaults to 3. A zero
 * rotation returns 0 (a no-op).
 */
function scrollLines(ticks, speed, linesPerTick = 3) {
    const truncated = Math.trunc(ticks);
    const perTick = speed === "fast" ? linesPerTick * FAST_MULTIPLIER : linesPerTick;
    return truncated * perTick;
}
/**
 * Plan a "jump to top of document" action: Cmd+Up (key code 126 with the
 * command modifier), sent once.
 */
function jumpTopPlan() {
    return {
        keyCode: 126,
        repeats: 1,
        modifiers: ["command down"],
    };
}
/**
 * Seconds to pause between consecutive synthetic key presses. macOS coalesces
 * (drops) System Events key codes fired back-to-back with no gap, which made
 * `linesPerTick` appear to have no effect — 6 presses scrolled the same as 1.
 * A small delay lets each press register so the count actually scales.
 */
const KEYSTROKE_DELAY_SECONDS = 0.02;
/**
 * Render a {@link KeystrokePlan} into an AppleScript that sends its key code
 * `repeats` times via System Events, pausing briefly between presses so they
 * are not coalesced.
 *
 * If `repeats <= 0`, returns a no-op script containing no `key code` line.
 * Otherwise emits a `repeat` loop. The `using {...}` clause is included only
 * when the plan has at least one modifier.
 */
function buildKeystrokeScript(plan) {
    if (plan.repeats <= 0) {
        return 'return "noop"';
    }
    const using = plan.modifiers.length > 0
        ? ` using {${plan.modifiers.join(", ")}}`
        : "";
    return [
        'tell application "System Events"',
        `\trepeat ${plan.repeats} times`,
        `\t\tkey code ${plan.keyCode}${using}`,
        `\t\tdelay ${KEYSTROKE_DELAY_SECONDS}`,
        "\tend repeat",
        "end tell",
        'return "ok"',
    ].join("\n");
}

/**
 * Invokes the native `scroll` helper (bin/macos/scroll) that posts a real
 * CGScrollWheel event. The helper path is derived from a base URL (normally
 * `import.meta.url` of the bundled plugin) so it resolves inside the installed
 * plugin folder. `exec` is injectable for tests.
 */
/** Resolve the helper binary path relative to the bundled plugin entry point. */
function scrollHelperPath(baseUrl) {
    return fileURLToPath(new URL("macos/scroll", baseUrl));
}
/** Post a signed line-count scroll via the helper. No-op for 0 lines. */
function runScroll(lines, baseUrl, exec = execFile) {
    if (lines === 0) {
        return Promise.resolve({ ok: true, trusted: true });
    }
    const bin = scrollHelperPath(baseUrl);
    return new Promise((resolve) => {
        exec(bin, [String(lines)], (error, _stdout, stderr) => {
            const trusted = !/untrusted/i.test(String(stderr ?? ""));
            resolve({ ok: !error, trusted });
        });
    });
}

/**
 * Dial action: rotate to scroll the frontmost window; press to either jump to
 * the top of the document or toggle between fast and slow scrolling. Defaults
 * are applied here (speed → slow, press → jump-to-top) so behaviour does not
 * depend on the property inspector persisting its dropdown defaults.
 */
let ScrollWindow = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.scroll" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.render(ev.action, ev.payload.settings);
            }
        }
        async onDialRotate(ev) {
            const speed = ev.payload.settings.speed ?? "slow";
            const linesPerTick = normalizeLinesPerTick(ev.payload.settings.linesPerTick);
            const lines = scrollLines(ev.payload.ticks, speed, linesPerTick);
            if (lines === 0)
                return;
            // One proportional scroll-wheel event via the native helper — no keystroke
            // spam, so the line count actually scales and there is no per-press lag.
            const result = await runScroll(lines, import.meta.url);
            if (!result.trusted) {
                streamDeck.logger.error("Scroll blocked. Grant Accessibility: System Settings > Privacy & Security > " +
                    "Accessibility > enable Stream Deck (synthetic scroll needs this).");
            }
        }
        async onDialDown(ev) {
            const settings = ev.payload.settings;
            if (settings.pressAction === "toggleSpeed") {
                const speed = nextSpeed(settings.speed ?? "slow");
                const updated = { ...settings, speed };
                await ev.action.setSettings(updated);
                await this.render(ev.action, updated);
                return;
            }
            // Default press behaviour: jump to the top of the document (⌘↑).
            const result = await runAppleScript(buildKeystrokeScript(jumpTopPlan()));
            if (!result.ok)
                this.warn(result.code);
        }
        /** Best-effort touchscreen readout of the current speed; never blocks scrolling. */
        async render(dial, settings) {
            const speed = settings.speed ?? "slow";
            try {
                await dial.setFeedback({
                    title: "Scroll",
                    value: speed === "fast" ? "Fast" : "Slow",
                });
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
        warn(code) {
            if (code === "permission-denied") {
                streamDeck.logger.error("Scroll blocked. Grant Accessibility: System Settings > Privacy & Security > " +
                    "Accessibility > enable Stream Deck (sending keystrokes needs this).");
            }
            else {
                streamDeck.logger.error(`Scroll failed: ${code}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Normalize raw {@link AppSettings} into a {@link ResolvedApp}.
 *
 * - `appName` is trimmed; missing → `""`.
 * - `titlePattern` is trimmed; missing or whitespace-only → `undefined`.
 */
function resolveApp(s) {
    const appName = (s.appName ?? "").trim();
    const trimmedPattern = (s.titlePattern ?? "").trim();
    const titlePattern = trimmedPattern.length > 0 ? trimmedPattern : undefined;
    return { appName, titlePattern };
}
/**
 * Build the AppleScript that opens or switches to the given app, optionally
 * raising the first window whose title contains `titlePattern`.
 *
 * - Empty `appName` → returns `""` (caller treats this as "not configured").
 * - No `titlePattern` → a simple `activate` (launches or switches to the app).
 * - With `titlePattern` → activates the app, then uses System Events to find
 *   and raise the first matching window.
 *
 * All interpolated user values are escaped via {@link escapeForAppleScript}.
 */
function buildAppScript(app) {
    if (app.appName.length === 0) {
        return "";
    }
    const appName = escapeForAppleScript(app.appName);
    if (app.titlePattern === undefined) {
        return `tell application "${appName}" to activate`;
    }
    const pattern = escapeForAppleScript(app.titlePattern);
    return [
        `tell application "${appName}" to activate`,
        `delay 0.15`,
        `tell application "System Events"`,
        `  tell process "${appName}"`,
        `    set matched to false`,
        `    repeat with w in windows`,
        `      if name of w contains "${pattern}" then`,
        `        perform action "AXRaise" of w`,
        `        set frontmost to true`,
        `        set matched to true`,
        `        exit repeat`,
        `      end if`,
        `    end repeat`,
        `  end tell`,
        `end tell`,
        `return "ok"`,
    ].join("\n");
}

/**
 * Open or switch to an app, optionally focusing a window whose title contains a
 * pattern. `activate` both launches (if needed) and switches; with a title
 * pattern, System Events raises the first matching window.
 */
let SwitchApp = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.switchapp" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onKeyDown(ev) {
            const app = resolveApp(ev.payload.settings ?? {});
            const script = buildAppScript(app);
            if (!script) {
                streamDeck.logger.warn("Open/Switch App pressed with no application configured.");
                await ev.action.showAlert();
                return;
            }
            const result = await runAppleScript(script);
            if (result.ok) {
                await ev.action.showOk();
                return;
            }
            await ev.action.showAlert();
            if (result.code === "permission-denied") {
                streamDeck.logger.error("App switch blocked. Grant access in System Settings > Privacy & Security: " +
                    "Automation (the target app) and, for title matching, Accessibility > Stream Deck.");
            }
            else {
                streamDeck.logger.error(`Open/Switch App failed: ${result.stderr || result.code}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the "cycle tmux window" dial: rotate to move between windows,
 * push for last-window, and render a dynamic touchscreen background that
 * reflects the current session/window. All functions are pure (no tmux, no
 * Stream Deck) so they unit test in isolation.
 */
/** Map a dial rotation to a window step: positive = next, negative = previous. */
function windowDirection(ticks) {
    const t = Math.trunc(ticks);
    if (t > 0)
        return "next";
    if (t < 0)
        return "prev";
    return "none";
}
/** tmux args to move to the next/previous window in the current session. */
function selectWindowDirArgs(direction) {
    return direction === "next" ? ["next-window"] : ["previous-window"];
}
/** tmux args to toggle to the previously active window (push = back-and-forth). */
const LAST_WINDOW_ARGS = ["last-window"];
/** tmux args reading the current window as `session|name|index`. */
const CURRENT_WINDOW_ARGS = [
    "display-message",
    "-p",
    "#{session_name}|#{window_name}|#{window_index}",
];
/** tmux args listing the active flag of each window in the current session. */
const WINDOW_FLAGS_ARGS = ["list-windows", "-F", "#{window_active}"];
/** Parse `session|name|index` into a {@link CurrentWindow}. */
function parseCurrentWindow(output) {
    const [session = "", name = "", index = "0"] = output.trim().split("|");
    return { session, name, index: Number.parseInt(index, 10) || 0 };
}
/** Parse the per-window active flags ("1" = active) preserving window order. */
function parseActiveFlags(output) {
    return output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .map((line) => line === "1");
}
/** Deterministic 0–359 hue derived from a session name, so colours are stable. */
function sessionHue(session) {
    let h = 0;
    for (let i = 0; i < session.length; i++) {
        h = (h * 31 + session.charCodeAt(i)) % 360;
    }
    return h;
}
function round$1(n) {
    return Math.round(n * 10) / 10;
}
/** Escape text for safe embedding inside SVG/XML. */
function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
/** Row of position dots; the active window's dot is larger and brighter. */
function dotsSvg(count, activeIndex, hue) {
    if (count <= 0)
        return "";
    const gap = 14;
    const startX = 100 - ((count - 1) * gap) / 2;
    const y = 86;
    let out = "";
    for (let i = 0; i < count; i++) {
        const cx = round$1(startX + i * gap);
        const active = i === activeIndex;
        const r = active ? 4 : 2.5;
        const fill = active ? `hsl(${hue},70%,78%)` : `hsl(${hue},30%,45%)`;
        out += `<circle cx="${cx}" cy="${y}" r="${r}" fill="${fill}"/>`;
    }
    return out;
}
/** Truncate a label so it fits the 200px touch strip. */
function truncate(value, max = 16) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
/**
 * Build the 200×100 touchscreen image as an SVG string: a session-tinted
 * vertical gradient, faint left/right chevrons hinting the dial rotates, the
 * session name (top) and current window name (centre), and a row of dots
 * showing the window position. Stream Deck layout items may not overlap, so all
 * of this lives in one full-area pixmap. User text is XML-escaped.
 */
function buildBackgroundSvg(opts) {
    const { hue, session, window, count, activeIndex } = opts;
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="hsl(${hue},55%,24%)"/>` +
        `<stop offset="1" stop-color="hsl(${hue},60%,10%)"/>` +
        `</linearGradient></defs>` +
        `<rect width="200" height="100" fill="url(#g)"/>` +
        `<path d="M14 50l-7 6 7 6" fill="none" stroke="hsl(${hue},45%,72%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` +
        `<path d="M186 50l7 6-7 6" fill="none" stroke="hsl(${hue},45%,72%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` +
        `<text x="100" y="24" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1.5" fill="hsl(${hue},45%,76%)">${escapeXml(truncate(session.toUpperCase(), 20))}</text>` +
        `<text x="100" y="60" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${escapeXml(truncate(window))}</text>` +
        dotsSvg(count, activeIndex, hue) +
        `</svg>`);
}
/** Encode an SVG string as a data URI usable as a layout pixmap value. */
function svgToDataUri(svg) {
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
/** Build the setFeedback payload for the current window + window flags. */
function buildWindowFeedback(current, flags) {
    const svg = buildBackgroundSvg({
        hue: sessionHue(current.session),
        session: current.session,
        window: current.name,
        count: flags.length,
        activeIndex: flags.indexOf(true),
    });
    return { bg: svgToDataUri(svg) };
}

/**
 * Dial action: rotate to cycle tmux windows, push for last-window. The
 * touchscreen shows a session-tinted background with position dots plus the
 * current session and window name, refreshed after every change.
 */
let CycleTmuxWindow = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.tmuxwindial" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.refresh(ev.action);
            }
        }
        async onDialRotate(ev) {
            const direction = windowDirection(ev.payload.ticks);
            if (direction !== "none") {
                const result = await runTmux(selectWindowDirArgs(direction), findTmuxPath());
                if (!result.ok) {
                    streamDeck.logger.error(`tmux ${direction}-window failed: ${result.stderr || "no server?"}`);
                }
            }
            await this.refresh(ev.action);
        }
        async onDialDown(ev) {
            await runTmux(LAST_WINDOW_ARGS, findTmuxPath());
            await this.refresh(ev.action);
        }
        /** Query the current window + flags and repaint the touchscreen. */
        async refresh(dial) {
            const tmux = findTmuxPath();
            const [current, flags] = await Promise.all([
                runTmux(CURRENT_WINDOW_ARGS, tmux),
                runTmux(WINDOW_FLAGS_ARGS, tmux),
            ]);
            if (!current.ok)
                return;
            const feedback = buildWindowFeedback(parseCurrentWindow(current.stdout), parseActiveFlags(flags.stdout));
            try {
                await dial.setFeedback(feedback);
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the tmux pane dial: rotate to switch panes, push to leave
 * copy-mode (return the cursor to the live prompt when scrolled up). All
 * functions are tmux-CLI-agnostic strings/args so they unit test without tmux.
 */
/** Map a dial rotation to a pane step: positive = next, negative = previous. */
function paneDirection(ticks) {
    const t = Math.trunc(ticks);
    if (t > 0)
        return "next";
    if (t < 0)
        return "prev";
    return "none";
}
/**
 * tmux args to select the next/previous pane relative to the current one
 * (`-t +` / `-t -`). Wraps around within the current window.
 */
function selectPaneArgs(direction) {
    return ["select-pane", "-t", direction === "next" ? "+" : "-"];
}
/** tmux args to read whether the current pane is in a mode (copy-mode/scrolled up). */
const PANE_IN_MODE_ARGS = ["display-message", "-p", "#{pane_in_mode}"];
/** tmux args to exit copy-mode — returns the cursor to the live prompt/bottom. */
const CANCEL_MODE_ARGS = ["send-keys", "-X", "cancel"];
/** Parse `#{pane_in_mode}` output: "1" means the pane is in copy-mode. */
function paneIsInMode(output) {
    return output.trim() === "1";
}

/**
 * Dial action: rotate to switch tmux panes (next/previous), push to exit
 * copy-mode so the cursor returns to the live prompt when the pane is scrolled
 * up. Operates on tmux's current pane (no per-button config needed).
 */
let TmuxPaneDial = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.tmuxpane" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onDialRotate(ev) {
            const direction = paneDirection(ev.payload.ticks);
            if (direction === "none")
                return;
            const result = await runTmux(selectPaneArgs(direction), findTmuxPath());
            if (!result.ok) {
                streamDeck.logger.error(`tmux select-pane failed: ${result.stderr || "no server?"}`);
            }
        }
        async onDialDown(_ev) {
            const tmux = findTmuxPath();
            const mode = await runTmux(PANE_IN_MODE_ARGS, tmux);
            // Only cancel when actually scrolled up — send-keys -X errors outside a mode.
            if (paneIsInMode(mode.stdout)) {
                await runTmux(CANCEL_MODE_ARGS, tmux);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the "window ring" dial/key: a user-curated list of windows you
 * tap through. A window is identified by (app, title) — macOS exposes no stable
 * window id via AppleScript, so a window whose title changes can drift out of
 * the ring (documented limitation). Focusing reuses `apps.ts` (activate + raise
 * the window whose title matches); the frontmost window is read via
 * `app-windows.ts` `FRONT_WINDOW_SCRIPT`.
 */
/** Two ring entries are the same window when app and title both match. */
function sameWindow(a, b) {
    return a.app === b.app && a.title === b.title;
}
/** Index of a window in the ring, or -1. */
function indexOfWindow(list, w) {
    return list.findIndex((x) => sameWindow(x, w));
}
/**
 * Toggle a window's membership: remove it if present, otherwise append it.
 * A window with an empty app (no frontmost window) is never added.
 */
function toggleWindow(list, w) {
    if (!w.app)
        return { list, added: false };
    const i = indexOfWindow(list, w);
    if (i >= 0)
        return { list: list.filter((_, idx) => idx !== i), added: false };
    return { list: [...list, w], added: true };
}
/**
 * Next cursor position (round-robin). A cursor of -1 (or non-integer) yields 0,
 * so the first tap lands on the first window. Negative values wrap correctly.
 */
function nextIndex(len, cursor) {
    if (len <= 0)
        return 0;
    const c = Number.isInteger(cursor) ? cursor : -1;
    return (((c + 1) % len) + len) % len;
}
function round(n) {
    return Math.round(n * 10) / 10;
}
/**
 * Build the 72×72 key image: a stacked-windows glyph, the window count, and a
 * ring that turns green when the current frontmost window is in the list.
 */
function buildRingImage(count, currentInList) {
    const ring = currentInList ? "#2ecc71" : "#5a5a5e";
    const label = String(count);
    const fontSize = label.length > 1 ? 24 : 28;
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" rx="12" fill="#1d1d1f"/>` +
        `<rect x="4" y="4" width="64" height="64" rx="10" fill="none" stroke="${ring}" stroke-width="4"/>` +
        `<rect x="20" y="14" width="24" height="18" rx="3" fill="#3a3a3c" stroke="#7a7a7e" stroke-width="2"/>` +
        `<rect x="28" y="22" width="24" height="18" rx="3" fill="#0a84ff" stroke="#3aa0ff" stroke-width="2"/>` +
        `<text x="36" y="${round(60)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
        `font-size="${fontSize}" font-weight="700" fill="#ffffff">${label}</text>` +
        `</svg>`);
}

/** Press held this long (ms) registers as a long press (add/remove). */
const LONG_PRESS_MS = 500;
/** How often the key icon re-checks whether the front window is in the ring. */
const POLL_MS = 3000;
/** Built-in macOS sound played on long-press when enabled. */
const SOUND_FILE = "/System/Library/Sounds/Tink.aiff";
/**
 * A user-curated ring of windows. Long-press adds the frontmost window (or
 * removes it if already in the ring); a short tap focuses the next window. The
 * long-press is detected at the threshold *while still held*, so feedback (a
 * key flash, plus an optional sound) fires the moment it registers.
 */
let WindowRing = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.windowring" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        pending = new Map();
        visible = new Map();
        timer;
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => void this.refreshAll(), POLL_MS);
            }
            await this.updateIcon(ev.action, ev.payload.settings.windows ?? []);
        }
        onWillDisappear(ev) {
            this.visible.delete(ev.action.id);
            const t = this.pending.get(ev.action.id);
            if (t !== undefined)
                clearTimeout(t);
            this.pending.delete(ev.action.id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        onKeyDown(ev) {
            const id = ev.action.id;
            // Fire the long-press handler at the threshold, while the key is still held.
            const t = setTimeout(() => {
                this.pending.delete(id);
                void this.handleLongPress(ev.action, ev.payload.settings).catch((err) => streamDeck.logger.error(`Window Ring long-press failed: ${String(err)}`));
            }, LONG_PRESS_MS);
            this.pending.set(id, t);
        }
        async onKeyUp(ev) {
            const t = this.pending.get(ev.action.id);
            if (t === undefined)
                return; // long press already handled at the threshold
            clearTimeout(t);
            this.pending.delete(ev.action.id);
            await this.handleShortPress(ev.action, ev.payload.settings);
        }
        /** Long press: toggle the frontmost window in the ring + give feedback. */
        async handleLongPress(action, settings) {
            const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
            if (!front.ok) {
                this.warn(front.code, "read the front window");
                await action.showAlert();
                return;
            }
            const window = parseFrontWindow(front.stdout);
            const before = settings.windows ?? [];
            const { list } = toggleWindow(before, window);
            if (list.length === before.length) {
                await action.showAlert(); // nothing to add (no frontmost window)
                return;
            }
            await action.setSettings({ ...settings, windows: list, cursor: settings.cursor ?? -1 });
            await action.showOk(); // visual: the long-press registered
            this.playSound(settings); // audio: optional
            await this.updateIcon(action, list);
        }
        /** Short tap: focus the next window in the ring (round-robin). */
        async handleShortPress(action, settings) {
            const list = settings.windows ?? [];
            if (list.length === 0) {
                await action.showAlert();
                return;
            }
            const cursor = nextIndex(list.length, settings.cursor ?? -1);
            const target = list[cursor];
            const result = await runAppleScript(buildAppScript(resolveApp({ appName: target.app, titlePattern: target.title })));
            if (!result.ok) {
                this.warn(result.code, `focus ${target.app}`);
                await action.showAlert();
            }
            await action.setSettings({ ...settings, cursor });
            await this.updateIcon(action, list);
        }
        /** Fire-and-forget system sound when enabled. */
        playSound(settings) {
            if (settings.sound !== true)
                return;
            execFile("/usr/bin/afplay", [SOUND_FILE], () => {
                /* best-effort; ignore errors */
            });
        }
        async refreshAll() {
            for (const action of this.visible.values()) {
                const settings = await action.getSettings();
                await this.updateIcon(action, settings.windows ?? []);
            }
        }
        /** Paint the count + a green/grey ring depending on whether the front window is a member. */
        async updateIcon(action, list) {
            try {
                const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
                const inList = front.ok ? indexOfWindow(list, parseFrontWindow(front.stdout)) >= 0 : false;
                await action.setImage(svgToDataUri$1(buildRingImage(list.length, inList)));
            }
            catch (err) {
                streamDeck.logger.debug(`Window Ring icon update skipped: ${String(err)}`);
            }
        }
        warn(code, what) {
            if (code === "permission-denied") {
                streamDeck.logger.error(`Window Ring could not ${what}. Grant Accessibility: System Settings > Privacy & ` +
                    "Security > Accessibility > enable Stream Deck.");
            }
            else {
                streamDeck.logger.error(`Window Ring failed to ${what} (${code}).`);
            }
        }
    });
    return _classThis;
})();

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
//# sourceMappingURL=plugin.js.map
