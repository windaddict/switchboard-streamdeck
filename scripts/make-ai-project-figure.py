#!/usr/bin/env python3
"""Regenerate docs/ai-project-keys.png, the README figure of the AI Project key.

WHAT IT'S FOR: the figure has to be rendered FROM the real key-face builder
(buildAgentProjectKeyImage in src/mac/agent-project.ts), not drawn by hand, or
it quietly starts lying the moment the design changes. The figure it replaces
showed the retired Claude Project key in a colour scheme the deck no longer
uses, and nothing could regenerate it. This script shells out to the actual
TypeScript builder for each key SVG, composes them with captions, and
rasterises with inkscape (the same tool make-hero.py, make-icons.py and
make-tmux-figure.py use).

The cases show one face per meaning in the deck's colour language: blue =
working, amber = waiting on you, white = idle, the red stripe = a finished
turn you have not looked at, and the dashed bar = no agent running.

Run it whenever buildAgentProjectKeyImage changes:
    python3 scripts/make-ai-project-figure.py
"""

import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "ai-project-keys.png"

INK = "#0F0F0F"
LABEL = "#C8C8C8"
SUB = "#8A8A8A"
MONO = "Menlo, Monaco, monospace"

# (builder args, caption, sub-caption).
CASES = [
    (dict(kind="claude", project="/Users/me/code/movingavg", host="tmux", hot=True, state="working", spin=3),
     "Claude working", "focused, under tmux"),
    (dict(kind="codex", project="/Users/me/code/copybug", host="iterm", hot=False, state="blocked"),
     "Codex waiting", "on your approval"),
    (dict(kind="cursor", project="/Users/me/code/builder", host="tmux", hot=False, state="waiting"),
     "Cursor idle", "at its prompt"),
    (dict(kind="claude", project="/Users/me/code/passages", host="terminal", hot=False, state="waiting", unseen=True),
     "Claude finished", "while you were away"),
    (dict(kind="claude", project="/Users/me/code/metronome", host="", hot=False, state="none"),
     "no agent", "running in the folder"),
]

KEY = 256
GAP = 81
PAD_X = 76
PAD_TOP = 76
CAP_GAP = 44
LINE = 32


def build_svgs(specs: list[dict]) -> list[str]:
    """Key faces straight from the real builder — never redrawn here."""
    snippet = ROOT / "sb-ai-figure-tmp.mts"
    snippet.write_text(
        'import { buildAgentProjectKeyImage } from "./src/mac/agent-project.js";\n'
        f"const cases = {json.dumps(specs)};\n"
        "process.stdout.write(JSON.stringify(cases.map((c: any) => buildAgentProjectKeyImage(c))));\n"
    )
    try:
        raw = subprocess.run(
            ["npx", "tsx", str(snippet)], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout
    finally:
        snippet.unlink(missing_ok=True)
    return json.loads(raw)


def inner(svg: str) -> str:
    """The body of a 72x72 key SVG, ready to nest inside the composite."""
    return svg[svg.index(">", svg.index("<svg")) + 1 : svg.rindex("</svg>")]


def main() -> None:
    svgs = build_svgs([c for c, _, _ in CASES])
    width = PAD_X * 2 + KEY * len(CASES) + GAP * (len(CASES) - 1)
    height = PAD_TOP + KEY + CAP_GAP + LINE * 2
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">',
        f'<rect width="{width}" height="{height}" fill="{INK}"/>',
    ]
    for i, (svg, (_, cap, sub)) in enumerate(zip(svgs, CASES)):
        x = PAD_X + i * (KEY + GAP)
        parts.append(
            f'<svg x="{x}" y="{PAD_TOP}" width="{KEY}" height="{KEY}" viewBox="0 0 72 72">'
            f"{inner(svg)}</svg>"
        )
        cx = x + KEY / 2
        ty = PAD_TOP + KEY + CAP_GAP
        parts.append(
            f'<text x="{cx}" y="{ty}" text-anchor="middle" font-family="{MONO}" '
            f'font-size="21" fill="{LABEL}">{cap}</text>'
        )
        parts.append(
            f'<text x="{cx}" y="{ty + LINE}" text-anchor="middle" font-family="{MONO}" '
            f'font-size="19" fill="{SUB}">{sub}</text>'
        )
    parts.append("</svg>")

    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as fh:
        fh.write("".join(parts))
        tmp = fh.name
    subprocess.run(
        ["inkscape", "-w", str(width), "-h", str(height), tmp, "-o", str(OUT)],
        check=True, capture_output=True,
    )
    pathlib.Path(tmp).unlink(missing_ok=True)
    print(f"wrote {OUT} ({len(CASES)} keys, {width}x{height})")


if __name__ == "__main__":
    main()
