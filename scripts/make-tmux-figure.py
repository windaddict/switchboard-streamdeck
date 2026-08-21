#!/usr/bin/env python3
"""Regenerate the two README figures that come from buildTmuxKeyImage:
docs/tmux-live-keys.png (the five states) and docs/claude-spark.gif (the spark
turning while Claude works).

WHAT IT'S FOR: the figure has to be rendered FROM the real key-face builder, not
drawn by hand, or it quietly starts lying the moment the design changes — which
is exactly what happened when the Claude "working" spark moved from amber to
blue. This script shells out to the actual TypeScript builder for the five key
SVGs, composes them into one SVG with their captions, and rasterises with
inkscape (the same tool make-hero.py and make-icons.py use).

Run it whenever buildTmuxKeyImage changes:  python3 scripts/make-tmux-figure.py
"""

import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "tmux-live-keys.png"
GIF = ROOT / "docs" / "claude-spark.gif"
GIF_PX = 144
GIF_DELAY = 40  # centiseconds, matching the original

INK = "#0F0F0F"
LABEL = "#C8C8C8"
SUB = "#8A8A8A"
MONO = "Menlo, Monaco, monospace"

# (key args, caption, sub-caption). Chosen to show every state the key can be in,
# including the two that matter most on a busy deck: which window has your
# keystrokes, and whether the agent in it still needs you.
CASES = [
    (dict(state="hot", session="dev", window="movingavg"), "focused", "Claude working"),
    (dict(state="cold", session="dev", window="movingavg"), "background", "Claude working"),
    (dict(state="cold", session="apps", window="copybug"), "background", "Claude ready for you"),
    (dict(state="cold", session="ops", window="deploy"), "background", "no Claude"),
    # The real unresolvable shape, straight from statusFor(): no session to put
    # in the eyebrow, and the window field holds the target string as typed.
    (dict(state="unknown", session="", window="dev:gone"), "window gone", ""),
]
CLAUDE = ["working", "working", "waiting", "none", "none"]

KEY = 256
GAP = 81
PAD_X = 76
PAD_TOP = 76
CAP_GAP = 44
LINE = 32


def build_svgs(specs: list[dict]) -> list[str]:
    """Key faces straight from the real builder — never redrawn here, or the
    figure starts lying the moment the design changes."""
    snippet = ROOT / "sb-figure-tmp.mts"
    payload = json.dumps(specs)
    snippet.write_text(
        'import { buildTmuxKeyImage } from "./src/mac/tmux-key.js";\n'
        f"const cases = {payload} as const;\n"
        "const out = cases.map((c: any) =>\n"
        "  buildTmuxKeyImage({ state: c.state, session: c.session, window: c.window }, c.claude, c.spin));\n"
        "process.stdout.write(JSON.stringify(out));\n"
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


def rasterise(svg: str, px: int, out: pathlib.Path) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as fh:
        fh.write(svg)
        tmp = fh.name
    subprocess.run(["inkscape", "-w", str(px), "-h", str(px), tmp, "-o", str(out)],
                   check=True, capture_output=True)
    pathlib.Path(tmp).unlink(missing_ok=True)


def make_gif() -> None:
    """The spark turning through one full orbit — 12 frames, one per poll tick,
    which is exactly how many distinct positions the orbit has."""
    specs = [dict(state="cold", session="dev", window="movingavg", claude="working", spin=i)
             for i in range(12)]
    with tempfile.TemporaryDirectory() as tmpdir:
        frames = []
        for i, svg in enumerate(build_svgs(specs)):
            frame = pathlib.Path(tmpdir) / f"f{i:02d}.png"
            rasterise(svg, GIF_PX, frame)
            frames.append(str(frame))
        subprocess.run(
            ["magick", "-delay", str(GIF_DELAY), "-loop", "0", *frames, str(GIF)],
            check=True, capture_output=True,
        )
    print(f"wrote {GIF} ({len(specs)} frames, {GIF_PX}x{GIF_PX})")


def main() -> None:
    svgs = build_svgs([{**c, "claude": cl, "spin": 3 if i == 0 else 0}
                       for i, ((c, _, _), cl) in enumerate(zip(CASES, CLAUDE))])
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
        if sub:
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
    make_gif()


if __name__ == "__main__":
    main()
