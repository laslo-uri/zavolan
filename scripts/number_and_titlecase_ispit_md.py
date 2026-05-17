#!/usr/bin/env python3
"""
Number headings: H1 kao 1, 2…; H2 kao 1, 2, 3… (ne 1.1, 1.2); H3+ kao 2.1, 2.1.1…
Serbian sentence case; Sadržaj — samo ## naslovi (1., 2., …), bez ### u listi.

Blok „Saobraćajna signalizacija“ (do „Uključivanje i isključivanje…“) uvučen je
za jedan nivo dubine — usklađeno sa modelom oblasti 8 u public/data.json.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from md_heading_slug import anchor_with_dedup

DOC = Path(__file__).resolve().parent.parent / "docs" / "Ispit Voznje Za Desetku (sa slikama).md"

_DOTTED_NUM = re.compile(r"^(?:\d+\.)+\d+\s+")
_SINGLE_NUM = re.compile(r"^\d+\s+")
ATX = re.compile(r"^(#{1,6}) (.+)$")
MAX_LEVEL = 6
PREGLED_H2 = re.compile(r"^## [\d.]+\s+Pregled strukture \(H1")
PREGLED_TITLE = "Pregled strukture (H1–H4)"


def normalize_heading_text(title: str) -> str:
    t = title.strip()
    while True:
        n = _DOTTED_NUM.sub("", t)
        n = _SINGLE_NUM.sub("", n)
        if n == t:
            break
        t = n
    return t.strip()


def _sentence_case_segment(s: str) -> str:
    # lstrip only: trailing space matters before inline `code` (e.g. Izvor: `file.md`)
    s = s.lstrip()
    if not s:
        return s
    lower = s.lower()
    for i, c in enumerate(lower):
        if c.isalpha():
            return lower[:i] + c.upper() + lower[i + 1 :]
    return lower


def nice_serbian_heading(title: str) -> str:
    t = normalize_heading_text(title)
    if not t:
        return t
    t = t.replace(":`", ": `")
    if re.match(r"^[bc]\)\s*", t, re.I):
        return t
    if re.match(r"^\d+\.\s+", t):
        return t
    if "`" in t:
        parts = re.split(r"(`[^`]+`)", t)
        out: list[str] = []
        for p in parts:
            if p.startswith("`") and p.endswith("`"):
                out.append(p)
            elif p.strip():
                out.append(_sentence_case_segment(p))
            else:
                out.append(p)
        return "".join(out)
    s = _sentence_case_segment(t)
    s = re.sub(r"\(h1[–-]h4\)", "(H1–H4)", s, flags=re.I)
    return s


def assign_numbers(entries: list[tuple[int | None, int, str]]) -> list[tuple[int | None, int, str, str]]:
    """
    H1: 1, 2, … | H2: 1, 2, 3, … (ne pod 1. kao 1.1) | H3+: n.1, n.2, n.1.1 …
    Pri novom H1 brojači za dubinu > 1 se resetuju.
    """
    result: list[tuple[int | None, int, str, str]] = []
    h = [0] * MAX_LEVEL
    for line_idx, level, raw in entries:
        lv = level - 1
        if lv < 0 or lv >= MAX_LEVEL:
            continue
        h[lv] += 1
        for j in range(lv + 1, MAX_LEVEL):
            h[j] = 0
        if lv == 0:
            num = str(h[0])
        elif lv == 1:
            num = str(h[1])
        else:
            num = ".".join(str(h[j]) for j in range(1, lv + 1))
        nice = nice_serbian_heading(raw)
        result.append((line_idx, level, num, nice))
    return result


def _is_pregled_heading(line: str) -> bool:
    return bool(PREGLED_H2.match(line) or re.match(r"^## [\d.]+\s+Pregled strukture", line, re.I))


def strip_pregled_block(lines: list[str]) -> list[str]:
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        if _is_pregled_heading(lines[i]):
            i += 1
            while i < n:
                if re.match(r"^#{1,6} [\d.]+\s+", lines[i]):
                    if _is_pregled_heading(lines[i]):
                        i += 1
                        continue
                    break
                i += 1
            continue
        out.append(lines[i])
        i += 1
    return out


def apply_signalization_depth_boost(rows: list[tuple[int | None, int, str]]) -> None:
    """
    Posle „Saobraćajna signalizacija na putevima“, do „Uključivanje i isključivanje iz saobraćaja“:
    sve naslove (osim tog uvodnog ##) povećaj za jedan # — kao podoblasti oblasti 8 na sajtu.
    """
    start = "Saobraćajna signalizacija na putevima"
    end = "Uključivanje i isključivanje iz saobraćaja"
    try:
        si = next(i for i, r in enumerate(rows) if r[2] == start)
        ei = next(i for i, r in enumerate(rows) if r[2] == end)
    except StopIteration:
        return
    for j in range(si + 1, ei):
        li, lv, t = rows[j]
        rows[j] = (li, min(lv + 1, MAX_LEVEL), t)


def build_nested_toc(
    numbered: list[tuple[int | None, int, str, str]],
    anchor_for,
) -> list[str]:
    """Bez H1; samo ## (nivo 2) kao 1., 2., … — bez ### u Sadržaju."""
    lines: list[str] = []
    h2_seq = 0
    for ln, lvl, _num, nice in numbered:
        if lvl == 1:
            continue
        if ln is None:
            continue
        if nice == "Sadržaj":
            continue
        if nice == PREGLED_TITLE:
            continue
        if lvl == 2:
            h2_seq += 1
            lines.append(f"  - [{h2_seq}. {nice}](#{anchor_for(_num, nice)})")
    return lines


def main() -> None:
    raw = DOC.read_text(encoding="utf-8")
    lines = strip_pregled_block(raw.splitlines(keepends=True))

    rows: list[tuple[int | None, int, str]] = []
    for i, line in enumerate(lines):
        m = ATX.match(line.rstrip("\r\n"))
        if m:
            inner = normalize_heading_text(m.group(2))
            rows.append((i, len(m.group(1)), inner))

    # Ako je „Pregled strukture“ još uvek u fajlu, ne sme biti sledeći „sidro“ posle Sadržaja —
    # inače se preskače samo do Pregleda i ostaje stari, pokvaren TOC.
    rows = [r for r in rows if r[2] != PREGLED_TITLE]

    apply_signalization_depth_boost(rows)

    sadrzaj_pos = next(j for j, r in enumerate(rows) if r[1] == 2 and r[2] == "Sadržaj")
    sadrzaj_line_idx = rows[sadrzaj_pos][0]
    inject_before_line = rows[sadrzaj_pos + 1][0]

    numbered = assign_numbers(rows)
    by_line: dict[int, tuple[int, str, str]] = {}
    for line_idx, level, num, nice in numbered:
        if line_idx is not None:
            by_line[line_idx] = (level, num, nice)

    sadrzaj_num = next(num for ln, lvl, num, nice in numbered if ln is not None and lvl == 2 and nice == "Sadržaj")

    used_slug: dict[str, int] = {}

    def anchor_for(num: str, nice: str) -> str:
        # Isti prikaz kao u HTML (# broj + naslov); duplikati: _1, _2 (kao Python-Markdown toc)
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

    DOC.write_text("".join(out), encoding="utf-8")
    print(f"Wrote {DOC} (signalizacija +1 nivo; TOC samo H2)")


if __name__ == "__main__":
    main()
