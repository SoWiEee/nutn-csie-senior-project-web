#!/usr/bin/env python3
"""Build a two-glyph LINE Seed TW outline supplement.

Requires fontTools with Brotli support. Run from the repository root:
    python scripts/build_line_seed_glyph_supplement.py

The glyphs are assembled from existing LINE Seed TW outlines rather than
borrowed from another typeface:
  U+4FE5  俥 = the 亻 component from 他 + the 車 component from 陣
  U+5A81  媁 = the 女 component from 媚 + the narrower 韋 proportions from 緯

Outputs are written to both the source site and release bundle font folders.
"""

from __future__ import annotations

from array import array
from pathlib import Path
import shutil

from fontTools.fontBuilder import FontBuilder
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.ttLib.tables.ttProgram import Program
from fontTools.pens.ttGlyphPen import TTGlyphPen


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "assets" / "fonts"
RELEASE_FONT_DIR = ROOT / "release" / "assets" / "fonts"
STYLES = (
    ("regular", 400, "line-seed-tw-regular.woff2"),
    ("bold", 700, "line-seed-tw-bold.woff2"),
)
SUPPLEMENT_FAMILY = "NUTN LINE Seed TW Glyph Supplement"
LICENSE_URL = "https://openfontlicense.org"
COPYRIGHT = (
    "Copyright (c) LY Corporation. Glyph compositions by the NUTN CSIE "
    "116 senior project website contributors."
)


def glyph_name(font: TTFont, codepoint: int) -> str:
    name = font.getBestCmap().get(codepoint)
    if name is None:
        raise ValueError(f"Source font is missing U+{codepoint:04X}")
    return name


def selected_contours(
    font: TTFont, codepoint: int, indices: tuple[int, ...] | None = None
) -> list[list[tuple[int, int, int]]]:
    """Return contours as (x, y, TrueType flag) points from a source glyph."""
    name = glyph_name(font, codepoint)
    source = font["glyf"][name]
    coordinates = source.coordinates
    ends = source.endPtsOfContours
    flags = source.flags
    selected = tuple(range(len(ends))) if indices is None else indices
    contours: list[list[tuple[int, int, int]]] = []
    start = 0
    contour_points: list[list[tuple[int, int, int]]] = []
    for end in ends:
        contour_points.append(
            [(coordinates[i][0], coordinates[i][1], int(flags[i])) for i in range(start, end + 1)]
        )
        start = end + 1
    for index in selected:
        contours.append(contour_points[index])
    return contours


def scale_component_x(
    contours: list[list[tuple[int, int, int]]], target_left: int, target_right: int
) -> list[list[tuple[int, int, int]]]:
    xs = [point[0] for contour in contours for point in contour]
    source_left, source_right = min(xs), max(xs)
    scale = (target_right - target_left) / (source_right - source_left)
    return [
        [(round(target_left + (x - source_left) * scale), y, flag) for x, y, flag in contour]
        for contour in contours
    ]


def translate_component_x(
    contours: list[list[tuple[int, int, int]]], offset: int
) -> list[list[tuple[int, int, int]]]:
    return [
        [(x + offset, y, flag) for x, y, flag in contour]
        for contour in contours
    ]


def combine(*components: list[list[tuple[int, int, int]]]) -> Glyph:
    points: list[tuple[int, int]] = []
    flags: list[int] = []
    ends: list[int] = []
    for contours in components:
        for contour in contours:
            points.extend((x, y) for x, y, _ in contour)
            flags.extend(flag for _, _, flag in contour)
            ends.append(len(points) - 1)

    glyph = Glyph()
    glyph.numberOfContours = len(ends)
    glyph.coordinates = GlyphCoordinates(points)
    glyph.endPtsOfContours = array("H", ends)
    glyph.flags = array("B", flags)
    glyph.program = Program()
    glyph.program.fromBytecode([])
    return glyph


def build_glyphs(source: TTFont, style: str) -> dict[str, Glyph]:
    # Component contour order differs between the regular and bold source
    # outlines, so select each part explicitly per weight.
    radical_person = selected_contours(source, 0x4ED6, (1,))
    car_indexes = (0, 2, 3, 4, 5) if style == "regular" else (0, 3, 4, 5, 6)
    car = selected_contours(source, 0x9663, car_indexes)
    female_indexes = (0, 4) if style == "regular" else (1, 2)
    female = selected_contours(source, 0x5A9A, female_indexes)
    if style == "regular":
        # In regular 緯, contours 0-4 are the right-side 韋 component.
        wei = selected_contours(source, 0x7DEF, (0, 1, 2, 3, 4))
    else:
        # The bold 緯 outline merges 韋 and 糸 into one contour. Preserve the
        # real bold weight by taking 偉's separable 韋, fitted to 緯's narrower
        # 542-unit right-side measure.
        wei = selected_contours(source, 0x5049, (0, 2, 3, 4, 5))
        wei = scale_component_x(wei, 417, 959)

    # The 車 in 陣 already has the intended right-side proportions. Likewise,
    # keep 他's 亻 at native size and nudge it right by 8/1000 em as requested.
    # 女 stays at the native size of its left-side form in 媚 and moves right
    # by 8/1000 em to balance the center of 媁.
    person = translate_component_x(radical_person, 8)
    female = translate_component_x(female, 8)

    return {
        ".notdef": TTGlyphPen(None).glyph(),
        "uni4FE5": combine(person, car),
        "uni5A81": combine(female, wei),
    }


def build_font(source_path: Path, output_path: Path, style: str, weight: int) -> None:
    source = TTFont(source_path)
    glyphs = build_glyphs(source, style)
    builder = FontBuilder(1000, isTTF=True)
    order = [".notdef", "uni4FE5", "uni5A81"]
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap({0x4FE5: "uni4FE5", 0x5A81: "uni5A81"})
    builder.setupGlyf(glyphs)

    metrics = {".notdef": (1000, 0)}
    for name in order[1:]:
        glyph = glyphs[name]
        metrics[name] = (1000, glyph.xMin)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=880, descent=-120)
    builder.setupNameTable(
        {
            "familyName": SUPPLEMENT_FAMILY,
            "styleName": style.title(),
            "uniqueFontIdentifier": f"NUTN-CSIE-Glyph-Supplement-{style}-1.0",
            "fullName": f"{SUPPLEMENT_FAMILY} {style.title()}",
            "psName": f"NUTNLineSeedSupplement-{style.title()}",
            "version": "Version 1.000",
            "copyright": COPYRIGHT,
            "licenseDescription": "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
            "licenseInfoURL": LICENSE_URL,
        }
    )
    builder.setupOS2(
        sTypoAscender=880,
        sTypoDescender=-120,
        usWinAscent=880,
        usWinDescent=120,
        usWeightClass=weight,
        usWidthClass=5,
        fsSelection=0x20 if weight >= 600 else 0,
    )
    builder.setupPost()
    builder.setupMaxp()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    font = builder.font
    font["head"].macStyle = 0x01 if weight >= 600 else 0x00
    font.flavor = "woff2"
    font.save(output_path)
    source.close()

    # Re-open the generated webfont and fail loudly if either codepoint or
    # outline did not survive the WOFF2 round trip.
    check = TTFont(output_path)
    cmap = check.getBestCmap()
    for codepoint in (0x4FE5, 0x5A81):
        name = cmap.get(codepoint)
        if name is None or check["glyf"][name].numberOfContours < 2:
            raise RuntimeError(f"Invalid generated glyph U+{codepoint:04X}: {output_path}")
    check.close()


def main() -> None:
    for style, weight, source_filename in STYLES:
        source_path = FONT_DIR / source_filename
        output_filename = f"line-seed-tw-supplement-{style}.woff2"
        output_path = FONT_DIR / output_filename
        build_font(source_path, output_path, style, weight)
        release_path = RELEASE_FONT_DIR / output_filename
        release_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output_path, release_path)
        print(f"Built {output_path.relative_to(ROOT)}")
        print(f"Copied {release_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
