#!/usr/bin/env python3
"""Generate every action icon and key image from one design system.

The system ("jack-line"): ink ground #0F1211 (matching the live key faces),
one 3px stroke weight on a 72-grid, family colors that encode what the action
drives (phosphor = tmux, azure = macOS windows/apps/web, amber = BBEdit,
teal = files), and a thin family-colored strip near the bottom of every key —
the patch-cable mark, quiet sibling of the live tmux face's status bar.

Key faces  (key.png 72 / key@2x.png 144): ink ground + glyph + jack-line.
List icons (icon.png 20 / icon@2x.png 40): bare glyph, transparent ground.

Rendering requires inkscape. Rerun after changing any glyph:
    python3 scripts/make-icons.py
"""

import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMGS = ROOT / "com.movingavg.switchboard.sdPlugin" / "imgs" / "actions"

INK = "#0F1211"
PHOSPHOR = "#3ECF6E"  # tmux family
AZURE = "#4E9CFF"  # macOS windows / apps / web family
AMBER = "#F0A63C"  # BBEdit family
TEAL = "#3EC9C4"  # files family
SIGNAL = "#F2FFF6"  # arrows / cursors
MUTED = "#8B9490"  # secondary strokes

S = 'stroke-linecap="round" stroke-linejoin="round" fill="none"'


def glyph_tmux() -> str:
    """Miniature of the live key face: window + lit status bar + cursor."""
    return (
        f'<rect x="14" y="13" width="44" height="36" rx="3" stroke="{PHOSPHOR}" stroke-width="3" fill="none"/>'
        f'<rect x="15.5" y="41" width="41" height="6.5" fill="{PHOSPHOR}"/>'
        f'<rect x="48" y="42" width="5" height="4.5" fill="{INK}"/>'
    )


def glyph_tmuxpane() -> str:
    """Split window, active pane lit."""
    return (
        f'<rect x="14" y="13" width="44" height="36" rx="3" stroke="{PHOSPHOR}" stroke-width="3" fill="none"/>'
        f'<rect x="37.5" y="15" width="19" height="32" fill="{PHOSPHOR}" opacity="0.45"/>'
        f'<path d="M36 13v36" stroke="{PHOSPHOR}" stroke-width="3"/>'
    )


def glyph_tmuxwindial() -> str:
    """Window with the strip's position dots, current window bright."""
    return (
        f'<rect x="14" y="13" width="44" height="36" rx="3" stroke="{PHOSPHOR}" stroke-width="3" fill="none"/>'
        f'<circle cx="27" cy="41" r="2.5" fill="{PHOSPHOR}" opacity="0.6"/>'
        f'<circle cx="36" cy="41" r="3.5" fill="{PHOSPHOR}"/>'
        f'<circle cx="45" cy="41" r="2.5" fill="{PHOSPHOR}" opacity="0.6"/>'
    )


def glyph_switchapp() -> str:
    """Back window, front window, and the jump between them."""
    return (
        f'<rect x="11" y="12" width="30" height="24" rx="3" stroke="{MUTED}" stroke-width="3" fill="none"/>'
        f'<rect x="31" y="26" width="30" height="24" rx="3" fill="{AZURE}"/>'
        f'<path d="M39 38h13m-5-5 5 5-5 5" stroke="{SIGNAL}" stroke-width="3" {S}/>'
    )


def glyph_appwindows() -> str:
    """A cascade of one app's windows, frontmost lit."""
    return (
        f'<rect x="12" y="10" width="32" height="24" rx="3" stroke="{MUTED}" stroke-width="3" fill="none" opacity="0.75"/>'
        f'<rect x="19" y="19" width="32" height="24" rx="3" stroke="{MUTED}" stroke-width="3" fill="{INK}"/>'
        f'<rect x="26" y="28" width="32" height="24" rx="3" fill="{AZURE}"/>'
    )


def glyph_windowring() -> str:
    """Windows sitting ON the ring — the feature, literally."""
    return (
        f'<circle cx="36" cy="33" r="20" stroke="{MUTED}" stroke-width="2.5" stroke-dasharray="1 6" {S}/>'
        f'<rect x="29" y="8" width="14" height="10" rx="2" fill="{AZURE}"/>'
        f'<rect x="11" y="38" width="14" height="10" rx="2" fill="{INK}" stroke="{MUTED}" stroke-width="2.5"/>'
        f'<rect x="47" y="38" width="14" height="10" rx="2" fill="{INK}" stroke="{MUTED}" stroke-width="2.5"/>'
    )


def glyph_scroll() -> str:
    """Window with a scrollbar, thumb lit."""
    return (
        f'<rect x="13" y="11" width="46" height="40" rx="3" stroke="{MUTED}" stroke-width="3" fill="none"/>'
        f'<path d="M51.5 16v30" stroke="{MUTED}" stroke-width="3" opacity="0.35" stroke-linecap="round"/>'
        f'<rect x="49.25" y="21" width="4.5" height="14" rx="2.25" fill="{AZURE}"/>'
        f'<path d="M22 24h18M22 31h18M22 38h12" stroke="{MUTED}" stroke-width="2.5" opacity="0.5" stroke-linecap="round"/>'
    )


def glyph_tile() -> str:
    """The grid, one cell placed."""
    return (
        f'<rect x="15" y="10" width="19" height="19" rx="3" stroke="{MUTED}" stroke-width="3" fill="none"/>'
        f'<rect x="38" y="10" width="19" height="19" rx="3" fill="{AZURE}"/>'
        f'<rect x="15" y="33" width="19" height="19" rx="3" stroke="{MUTED}" stroke-width="3" fill="none"/>'
        f'<rect x="38" y="33" width="19" height="19" rx="3" stroke="{MUTED}" stroke-width="3" fill="none"/>'
    )


def glyph_jump() -> str:
    """Browser tab row, active tab lit, arrow jumping into it."""
    return (
        f'<rect x="12" y="13" width="48" height="38" rx="3" stroke="{MUTED}" stroke-width="3" fill="none"/>'
        f'<path d="M12 24h48" stroke="{MUTED}" stroke-width="2.5" opacity="0.6"/>'
        f'<rect x="17" y="16.5" width="9" height="5" rx="1.5" fill="{MUTED}" opacity="0.6"/>'
        f'<rect x="30" y="15.5" width="12" height="7" rx="1.5" fill="{AZURE}"/>'
        f'<rect x="46" y="16.5" width="9" height="5" rx="1.5" fill="{MUTED}" opacity="0.6"/>'
        f'<path d="M27 44c6-3 9-9 9-14m-5 4 5-5 5 5" stroke="{SIGNAL}" stroke-width="3" {S}/>'
    )


def glyph_bbeditdoc() -> str:
    """Document between the dial's two directions."""
    return (
        f'<rect x="24" y="11" width="24" height="32" rx="3" stroke="{AMBER}" stroke-width="3" fill="none"/>'
        f'<path d="M30 20h12M30 27h12M30 34h7" stroke="{AMBER}" stroke-width="2.5" opacity="0.8" stroke-linecap="round"/>'
        f'<path d="M16 21l-6 6 6 6" stroke="{MUTED}" stroke-width="3" {S}/>'
        f'<path d="M56 21l6 6-6 6" stroke="{MUTED}" stroke-width="3" {S}/>'
    )


def glyph_openfile() -> str:
    """Document opening outward."""
    return (
        f'<rect x="17" y="12" width="26" height="34" rx="3" stroke="{TEAL}" stroke-width="3" fill="none"/>'
        f'<path d="M23 21h14M23 28h10" stroke="{TEAL}" stroke-width="2.5" opacity="0.8" stroke-linecap="round"/>'
        f'<path d="M38 38 55 21m0 8v-8h-8" stroke="{SIGNAL}" stroke-width="3" {S}/>'
    )


ACTIONS = {
    "tmux": (glyph_tmux, PHOSPHOR),
    "tmuxpane": (glyph_tmuxpane, PHOSPHOR),
    "tmuxwindial": (glyph_tmuxwindial, PHOSPHOR),
    "switchapp": (glyph_switchapp, AZURE),
    "appwindows": (glyph_appwindows, AZURE),
    "windowring": (glyph_windowring, AZURE),
    "scroll": (glyph_scroll, AZURE),
    "tile": (glyph_tile, AZURE),
    "jump": (glyph_jump, AZURE),
    "bbeditdoc": (glyph_bbeditdoc, AMBER),
    "openfile": (glyph_openfile, TEAL),
}


def key_svg(glyph: str, family: str) -> str:
    jack_line = f'<rect x="8" y="62.5" width="56" height="3.5" rx="1.75" fill="{family}" opacity="0.95"/>'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">'
        f'<rect width="72" height="72" fill="{INK}"/>{glyph}{jack_line}</svg>'
    )


def icon_svg(glyph: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">'
        f"{glyph}</svg>"
    )


def render(svg: str, out: pathlib.Path, width: int) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f:
        f.write(svg)
        tmp = f.name
    subprocess.run(
        ["inkscape", "--export-type=png", f"--export-width={width}", f"--export-filename={out}", tmp],
        check=True,
        capture_output=True,
    )
    pathlib.Path(tmp).unlink()


def main() -> None:
    for name, (glyph_fn, family) in ACTIONS.items():
        d = IMGS / name
        d.mkdir(parents=True, exist_ok=True)
        glyph = glyph_fn()
        render(key_svg(glyph, family), d / "key.png", 72)
        render(key_svg(glyph, family), d / "key@2x.png", 144)
        render(icon_svg(glyph), d / "icon.png", 20)
        render(icon_svg(glyph), d / "icon@2x.png", 40)
        print(f"{name}: key 72/144, icon 20/40")


if __name__ == "__main__":
    sys.exit(main())
