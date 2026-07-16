#!/usr/bin/env python3
"""Generate docs/switchboard-hero.png from the plugin's own action icons.

Reads the action list from the manifest, lays the key icons out in a centered
grid under a title/tagline header, and rasterizes via inkscape. Self-contained
(icons are base64-embedded), so re-run it whenever actions are added/renamed:

    python3 scripts/make-hero.py
"""

import base64
import json
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "com.movingavg.switchboard.sdPlugin")
OUT = os.path.join(ROOT, "docs", "switchboard-hero.png")

W = 1280
COLS = 6
PAD = 48
PITCH = (W - 2 * PAD) / COLS  # horizontal distance between cell centers
ICON = 88
ROW_GAP = 150
GRID_TOP = 210


def data_uri(path: str) -> str:
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main() -> None:
    manifest = json.load(open(os.path.join(PLUGIN, "manifest.json")))
    actions = []
    for a in manifest["Actions"]:
        slug = a["Icon"].replace("imgs/actions/", "").split("/")[0]
        icon = os.path.join(PLUGIN, "imgs", "actions", slug, "key@2x.png")
        if not os.path.exists(icon):
            icon = os.path.join(PLUGIN, "imgs", "actions", slug, "key.png")
        actions.append((a["Name"], data_uri(icon)))

    rows = [actions[i:i + COLS] for i in range(0, len(actions), COLS)]
    height = int(GRID_TOP + len(rows) * ROW_GAP + 20)

    header_icon = data_uri(os.path.join(PLUGIN, "imgs", "plugin", "marketplace.png"))

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" '
        f'viewBox="0 0 {W} {height}" font-family="Helvetica, Arial, sans-serif">',
        f'<rect width="{W}" height="{height}" fill="#0e0e10"/>',
        f'<image x="{PAD}" y="40" width="92" height="92" href="{header_icon}"/>',
        f'<text x="{PAD + 110}" y="92" fill="#f5f5f7" font-size="52" font-weight="700">Switchboard</text>',
        f'<text x="{PAD + 112}" y="126" fill="#9b9ba1" font-size="18">'
        "An operator&#8217;s control surface for macOS — Claude Code, tabs, windows, panes &amp; files.</text>",
        f'<line x1="{PAD}" y1="168" x2="{W - PAD}" y2="168" stroke="#2a2a2e" stroke-width="1"/>',
    ]

    for r, row in enumerate(rows):
        row_y = GRID_TOP + r * ROW_GAP
        k = len(row)
        left_center = W / 2 - (k - 1) * PITCH / 2
        for i, (name, uri) in enumerate(row):
            cx = left_center + i * PITCH
            parts.append(
                f'<image x="{cx - ICON / 2:.1f}" y="{row_y}" width="{ICON}" height="{ICON}" '
                f'href="{uri}"/>'
            )
            parts.append(
                f'<text x="{cx:.1f}" y="{row_y + ICON + 24}" fill="#c7c7cc" font-size="14" '
                f'text-anchor="middle">{esc(name)}</text>'
            )

    parts.append("</svg>")
    svg = "\n".join(parts)

    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f:
        f.write(svg)
        svg_path = f.name

    subprocess.run(
        ["inkscape", svg_path, "--export-type=png", f"--export-filename={OUT}", f"--export-width={W}"],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    os.unlink(svg_path)
    print(f"wrote {OUT} ({len(actions)} actions)")


if __name__ == "__main__":
    main()
