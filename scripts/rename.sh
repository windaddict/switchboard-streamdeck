#!/usr/bin/env bash
#
# rename.sh — rename this plugin from its legacy UUID to the Switchboard UUID,
# AND migrate every already-configured Stream Deck button so no setup is lost.
#
# Stream Deck identifies a plugin (and every placed button) by the action UUID.
# Button configs — including their Settings — live in the profile store keyed by
# that UUID. So renaming means changing the UUID in BOTH the plugin and the
# profiles. This script does both, with a backup and safety rails.
#
# Usage:
#   scripts/rename.sh --dry-run     # print every action, change nothing
#   scripts/rename.sh --yes         # do it (Stream Deck must be QUIT first)
#
# Edit OLD_ID / NEW_ID below if you want a different target id.

set -euo pipefail

OLD_ID="com.johnknox.safarijump"
NEW_ID="com.movingavg.switchboard"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SD_SUPPORT="$HOME/Library/Application Support/com.elgato.StreamDeck"
PLUGINS_DIR="$SD_SUPPORT/Plugins"
PROFILES_DIR="$SD_SUPPORT/ProfilesV3"
BACKUP_DIR="$HOME/Desktop/switchboard-rename-backup-$(date +%Y%m%d-%H%M%S)"

DRY_RUN=1
for arg in "$@"; do
	case "$arg" in
		--yes) DRY_RUN=0 ;;
		--dry-run) DRY_RUN=1 ;;
		*) echo "unknown arg: $arg" >&2; exit 2 ;;
	esac
done

say()  { printf '\033[1m%s\033[0m\n' "$*"; }
run()  { if [ "$DRY_RUN" = 1 ]; then echo "  [dry-run] $*"; else eval "$*"; fi; }

# --- preconditions -----------------------------------------------------------
# A real run needs Stream Deck quit (it rewrites the live profile store); a
# dry-run only prints, so it's fine while SD is up.
if [ "$DRY_RUN" = 0 ] && pgrep -x "Stream Deck" >/dev/null 2>&1; then
	echo "Stream Deck is RUNNING. Quit it completely, then re-run." >&2
	exit 1
fi
if [ ! -d "$REPO/$OLD_ID.sdPlugin" ]; then
	echo "Plugin folder $OLD_ID.sdPlugin not found in $REPO — already renamed?" >&2
	exit 1
fi

say "Switchboard rename: $OLD_ID  ->  $NEW_ID"
[ "$DRY_RUN" = 1 ] && say "(DRY RUN — nothing will change. Re-run with --yes to apply.)"

# --- 1. back up the profile store (so button layouts are recoverable) --------
say "1. Backing up profiles + plugin folder to: $BACKUP_DIR"
run "mkdir -p \"$BACKUP_DIR\""
run "cp -R \"$PROFILES_DIR\" \"$BACKUP_DIR/ProfilesV3\""
run "cp -R \"$REPO/$OLD_ID.sdPlugin\" \"$BACKUP_DIR/$OLD_ID.sdPlugin\""

# --- 2. rewrite the UUID EVERYWHERE in the repo ------------------------------
# Crucially this includes the @action decorators in src/actions/*.ts — if the
# manifest and the compiled code disagree on a UUID, the SDK rejects the plugin
# and Stream Deck disables it. Replace across all tracked files (not just a
# hand-picked list), excluding node_modules and .git.
say "2. Rewriting UUID across the repo (manifest, src decorators, configs, tests, docs)"
while IFS= read -r f; do
	run "sed -i '' \"s/$OLD_ID/$NEW_ID/g\" \"$f\""
done < <(grep -rl "$OLD_ID" "$REPO" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null)
# cosmetic: npm package name
run "sed -i '' 's/\"streamdeck-safari-jump\"/\"switchboard\"/' \"$REPO/package.json\""

# --- 3. rename the .sdPlugin folder -----------------------------------------
say "3. Renaming plugin folder"
run "mv \"$REPO/$OLD_ID.sdPlugin\" \"$REPO/$NEW_ID.sdPlugin\""

# --- 4. rebuild (rollup output path + validate now use the new id) ----------
say "4. Rebuilding"
run "(cd \"$REPO\" && npm run build)"

# --- 5. repoint the Stream Deck plugin symlink ------------------------------
say "5. Updating the Stream Deck plugin symlink"
run "rm -f \"$PLUGINS_DIR/$OLD_ID.sdPlugin\""
run "ln -s \"$REPO/$NEW_ID.sdPlugin\" \"$PLUGINS_DIR/$NEW_ID.sdPlugin\""

# --- 6. migrate configured buttons in the profile store ---------------------
say "6. Migrating configured buttons (UUID swap in profiles)"
if [ "$DRY_RUN" = 1 ]; then
	grep -rl "$OLD_ID" "$PROFILES_DIR" 2>/dev/null | while read -r f; do
		echo "  [dry-run] sed -i '' s/$OLD_ID/$NEW_ID/g  \"$f\""
	done
else
	grep -rl "$OLD_ID" "$PROFILES_DIR" 2>/dev/null | while read -r f; do
		sed -i '' "s/$OLD_ID/$NEW_ID/g" "$f"
	done
fi

# --- done --------------------------------------------------------------------
say "Done."
cat <<EOF

Next steps:
  1. Relaunch Stream Deck — your buttons should reappear with their settings.
  2. If anything looks wrong, quit Stream Deck and restore the backup:
       rm -rf "$PROFILES_DIR" && cp -R "$BACKUP_DIR/ProfilesV3" "$PROFILES_DIR"
  3. Review and commit the repo changes:  git -C "$REPO" status
  4. (Optional) rename the repo directory itself to 'switchboard' and update
     the symlink target — purely cosmetic, not required for buttons to work.
EOF
