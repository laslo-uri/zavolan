#!/usr/bin/env python3
"""
Numeriše naslove u tekstualnom izdanju (Ispit Voznje Za Desetku.md) po istom pravilu
kao u „(sa slikama).md“: lanac ## iz referencije, assign_numbers, signalizacija +1 nivo, TOC.

Uklanja stari grupisani Sadržaj (### grupe i liste). „Podaci o izdanju“ zauzima mesto „Izvor“.
"""

from __future__ import annotations

import difflib
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from md_heading_slug import anchor_with_dedup
from number_and_titlecase_ispit_md import (
    ATX,
    MAX_LEVEL,
    PREGLED_TITLE,
    apply_signalization_depth_boost,
    assign_numbers,
    build_nested_toc,
    nice_serbian_heading,
    normalize_heading_text,
    strip_pregled_block,
)

REF = _SCRIPT_DIR.parent / "docs" / "Ispit Voznje Za Desetku (sa slikama).md"
TEXT = _SCRIPT_DIR.parent / "docs" / "Ispit Voznje Za Desetku.md"

MATCH_RATIO = 0.78
CAPS_INJECT_RATIO = 0.72


def _norm_key(title: str) -> str:
    t = nice_serbian_heading(normalize_heading_text(title))
    return re.sub(r"\s+", " ", t.lower().strip())


def extract_h2_chain(ref_path: Path) -> list[str]:
    out: list[str] = []
    for line in ref_path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^## (\d+) (.+)$", line.strip())
        if not m:
            continue
        inner = normalize_heading_text(m.group(2))
        out.append(nice_serbian_heading(inner))
    return out


def remove_grouped_toc(lines: list[str]) -> list[str]:
    """Zadrži „## Sadržaj“, ukloni sve do prvog --- posle njega."""
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        if re.match(r"^##\s+Sadržaj\s*$", lines[i].rstrip("\r\n")):
            out.append(lines[i])
            i += 1
            while i < n and lines[i].strip() != "---":
                i += 1
            if i < n and lines[i].strip() == "---":
                i += 1
            continue
        out.append(lines[i])
        i += 1
    return out


def _has_auto_toc(content: str) -> bool:
    return "  - [1. Podaci o izdanju]" in content or "  - [1. Izvor]" in content


def strip_atx_numbers(lines: list[str]) -> list[str]:
    """Skida vodeće brojeve iz ATX naslova (npr. ## 3 Recenzija -> ## Recenzija)."""
    pat = re.compile(r"^(#{1,6})\s+(?:\d+(?:\.\d+)*)\s+(.+?)\s*$")
    out: list[str] = []
    for line in lines:
        stripped = line.rstrip("\r\n")
        m = pat.match(stripped)
        nl = "\n" if line.endswith("\n") else ""
        if m:
            out.append(f"{m.group(1)} {m.group(2)}{nl}")
        else:
            out.append(line)
    return out


def remove_auto_nested_toc(lines: list[str]) -> list[str]:
    """Posle „## [n] Sadržaj“ uklanja automatski generisanu listu linkova."""
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        if re.match(r"^##\s+(?:\d+\s+)?Sadržaj\s*$", line.rstrip("\r\n")):
            out.append(line)
            i += 1
            while i < n and (lines[i].lstrip().startswith("- ") or lines[i].strip() == ""):
                i += 1
            continue
        out.append(line)
        i += 1
    return out


def _is_caps_banner(s: str) -> bool:
    t = s.strip()
    if len(t) < 12 or t.startswith("**"):
        return False
    letters = [c for c in t if c.isalpha()]
    if len(letters) < 8:
        return False
    up = sum(1 for c in letters if c.isupper())
    return up / len(letters) >= 0.85


def inject_caps_headings(lines: list[str], h2_chain: list[str]) -> list[str]:
    """
    U tekstu su neka poglavlja kao ALL CAPS bez # — umetni ### da se poklope sa referentnim H2.
    Samo ## u ulazu pomeraju ref_i; ### ne pomeraju.
    """
    ref_i = 0
    out: list[str] = []
    for line in lines:
        m = ATX.match(line.rstrip("\r\n"))
        if m:
            level = len(m.group(1))
            inner = normalize_heading_text(m.group(2))
            nt = nice_serbian_heading(inner)
            if level == 1:
                out.append(line)
                continue
            if level == 2:
                if (
                    ref_i == 0
                    and h2_chain
                    and h2_chain[0] == "Izvor"
                    and _norm_key(nt) == _norm_key("Podaci o izdanju")
                ):
                    ref_i = 1
                elif ref_i < len(h2_chain) and difflib.SequenceMatcher(
                    None, _norm_key(nt), _norm_key(h2_chain[ref_i])
                ).ratio() >= MATCH_RATIO:
                    ref_i += 1
            out.append(line)
            continue

        raw = line.strip()
        if ref_i < len(h2_chain) and _is_caps_banner(raw):
            r = difflib.SequenceMatcher(None, _norm_key(raw), _norm_key(h2_chain[ref_i])).ratio()
            if r >= CAPS_INJECT_RATIO:
                nl = "\n" if line.endswith("\n") else ""
                out.append(f"### {nice_serbian_heading(raw)}{nl}")
                ref_i += 1
                continue
        m_bold = re.match(r"^\*\*(.+)\*\*$", raw)
        if ref_i < len(h2_chain) and m_bold:
            inner_b = m_bold.group(1).strip()
            r = difflib.SequenceMatcher(None, _norm_key(inner_b), _norm_key(h2_chain[ref_i])).ratio()
            if r >= CAPS_INJECT_RATIO:
                nl = "\n" if line.endswith("\n") else ""
                out.append(f"### {nice_serbian_heading(inner_b)}{nl}")
                ref_i += 1
                continue
        out.append(line)
    return out


def infer_heading_levels(
    rows: list[tuple[int | None, int, str]],
    h2_chain: list[str],
) -> tuple[list[tuple[int | None, int, str]], dict[int, str]]:
    """
    rows: (line_idx, atx_level, raw_inner) — vraća nove redove sa prilagođenim level
    i mapu linija koje postaju **naslov** (duplikat prethodnog H2).
    """
    ref_idx = 0
    bold_lines: dict[int, str] = {}
    out: list[tuple[int | None, int, str]] = []

    for li, _lv, raw in rows:
        inner = normalize_heading_text(raw)
        nt = nice_serbian_heading(inner)

        if _lv == 1:
            out.append((li, 1, inner))
            continue

        if ref_idx == 0 and h2_chain and h2_chain[0] == "Izvor":
            if _norm_key(inner) == _norm_key("Podaci o izdanju"):
                out.append((li, 2, inner))
                ref_idx = 1
                continue

        # Usklađivanje sa lancem: mali prozor da podnaslovi (npr. „prelaz pruge“) ne „pojedu“ poglavlja 8–25;
        # širi prozor tek posle lanca opreme/prevoza (indeks ≥ 52 u referenci) gde OCR često izostavi ###.
        win = 25 if ref_idx >= 52 else 4
        best_k: int | None = None
        for k in range(ref_idx, min(ref_idx + win, len(h2_chain))):
            r = difflib.SequenceMatcher(None, _norm_key(inner), _norm_key(h2_chain[k])).ratio()
            if r >= MATCH_RATIO:
                best_k = k
                break
        if best_k is not None:
            out.append((li, 2, inner))
            ref_idx = best_k + 1
            continue

        if ref_idx > 0:
            r_prev = difflib.SequenceMatcher(
                None, _norm_key(inner), _norm_key(h2_chain[ref_idx - 1])
            ).ratio()
            if r_prev >= MATCH_RATIO:
                bold_lines[li] = nt
                continue

        out.append((li, 3, inner))

    return out, bold_lines


def main() -> None:
    h2_chain = extract_h2_chain(REF)
    if not h2_chain:
        sys.exit("Referencija: nema ## naslova.")

    raw = TEXT.read_text(encoding="utf-8")
    lines = strip_pregled_block(raw.splitlines(keepends=True))
    used_auto_toc_recovery = _has_auto_toc(raw)
    if used_auto_toc_recovery:
        lines = strip_atx_numbers(lines)
        lines = remove_auto_nested_toc(lines)
    else:
        lines = remove_grouped_toc(lines)
    lines = inject_caps_headings(lines, h2_chain)

    rows: list[tuple[int | None, int, str]] = []
    for i, line in enumerate(lines):
        m = ATX.match(line.rstrip("\r\n"))
        if m:
            inner = normalize_heading_text(m.group(2))
            rows.append((i, len(m.group(1)), inner))

    rows = [r for r in rows if r[2] != PREGLED_TITLE]
    heading_rows, bold_lines = infer_heading_levels(rows, h2_chain)

    apply_signalization_depth_boost(heading_rows)

    try:
        sadrzaj_pos = next(j for j, r in enumerate(heading_rows) if r[1] == 2 and r[2] == "Sadržaj")
    except StopIteration:
        sys.exit("Nema naslova „Sadržaj“ (##).")

    sadrzaj_line_idx = heading_rows[sadrzaj_pos][0]
    inject_before_line = heading_rows[sadrzaj_pos + 1][0]

    numbered = assign_numbers(heading_rows)
    by_line: dict[int, tuple[int, str, str]] = {}
    for line_idx, level, num, nice in numbered:
        if line_idx is not None:
            by_line[line_idx] = (level, num, nice)

    sadrzaj_num = next(
        num for ln, lvl, num, nice in numbered if ln is not None and lvl == 2 and nice == "Sadržaj"
    )

    used_slug: dict[str, int] = {}

    def anchor_for(num: str, nice: str) -> str:
        return anchor_with_dedup(f"{num} {nice}".strip(), used_slug)

    nested = build_nested_toc(numbered, anchor_for)
    toc_lines = [
        f"## {sadrzaj_num} Sadržaj",
        "",
        *nested,
        "",
    ]
    toc_block = [x + "\n" for x in toc_lines]

    out: list[str] = []
    i = 0
    while i < len(lines):
        if i == sadrzaj_line_idx:
            i += 1
            continue
        if sadrzaj_line_idx < i < inject_before_line:
            i += 1
            continue
        if i == inject_before_line:
            out.extend(toc_block)

        if i in bold_lines:
            out.append(f"**{bold_lines[i]}**\n")
            i += 1
            continue

        line = lines[i]
        m = ATX.match(line.rstrip("\r\n"))
        if m:
            idx = i
            if idx in by_line:
                lv, num, nice = by_line[idx]
                nl = "\n" if line.endswith("\n") else ""
                out.append(f"{'#' * lv} {num} {nice}{nl}")
            i += 1
            continue
        out.append(line)
        i += 1

    TEXT.write_text("".join(out), encoding="utf-8")
    print(f"Wrote {TEXT}")
    print(f"Referentnih H2: {len(h2_chain)}; MATCH_RATIO={MATCH_RATIO}; bold_duplikata: {len(bold_lines)}")


if __name__ == "__main__":
    main()
