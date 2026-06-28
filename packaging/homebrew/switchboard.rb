# Homebrew Cask for Switchboard.
#
# To publish:
#   1. `npm run build && npm run pack:zip` to produce
#      dist/com.movingavg.switchboard.sdPlugin.zip
#   2. Attach that zip to a GitHub Release tagged v<version>.
#   3. Fill in version and sha256 below
#      (`shasum -a 256 dist/com.movingavg.switchboard.sdPlugin.zip`).
#   4. Host this file in a tap repo named `homebrew-switchboard` under Casks/,
#      so users can: `brew install --cask windaddict/switchboard/switchboard`.
#      (Or users can install it directly from a local copy:
#       `brew install --cask ./packaging/homebrew/switchboard.rb`.)

cask "switchboard" do
  version "1.0.0"
  sha256 "0f87d1a5a7f67f5ccc6e565a81c25af5e51c31f1af72a6c16b8d46dcdece6ff5"

  url "https://github.com/windaddict/switchboard-streamdeck/releases/download/v#{version}/com.movingavg.switchboard.sdPlugin.zip"
  name "Switchboard"
  desc "Stream Deck plugin for fast macOS context-switching (Safari, tmux, iTerm2, BBEdit, windows, files)"
  homepage "https://github.com/windaddict/switchboard-streamdeck"

  depends_on macos: :monterey

  # Install the self-contained plugin folder into the Stream Deck Plugins dir.
  artifact "com.movingavg.switchboard.sdPlugin",
           target: "#{Dir.home}/Library/Application Support/com.elgato.StreamDeck/Plugins/com.movingavg.switchboard.sdPlugin"

  caveats <<~EOS
    Quit and relaunch the Stream Deck app to load Switchboard, then drag its
    actions onto your keys/dials. On first use macOS will ask for Accessibility
    and Automation permissions for Stream Deck — approve them.
  EOS

  zap trash: "#{Dir.home}/Library/Application Support/com.elgato.StreamDeck/Plugins/com.movingavg.switchboard.sdPlugin"
end
