"""
Sidra za naslove: ista pravila u Sadržaju (.md) i u HTML (Python-Markdown TocExtension).
Duplikati: drugi i dalje idu kao base_1, base_2 (kao markdown.extensions.toc.unique).
"""

from __future__ import annotations

import re


def slugify_heading_display(display: str) -> str:
    """Tekst naslova kao u pregledu (npr. '3 Recenzija', '1 Izvor: fajl.md') -> id."""
    t = display.lower().strip().replace("`", "")
    out: list[str] = []
    for c in t:
        if c.isalnum():
            out.append(c)
        elif c in " -–—\t\n":
            out.append("-")
    s = "".join(out)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "section"


def anchor_with_dedup(display: str, used: dict[str, int]) -> str:
    """Jedinstveno sidro; drugi isti naslov -> suffix _1, _2 (usklađeno sa markdown toc)."""
    base = slugify_heading_display(display)
    k = used.get(base, 0)
    used[base] = k + 1
    return base if k == 0 else f"{base}_{k}"


def toc_slugify_for_markdown(value: str, separator: str) -> str:
    """Potpis koji očekuje markdown.extensions.toc.TocExtension(slugify=...)."""
    # separator ignorisan — koristimo '-'; duplikate rešava Treeprocessor posebno
    return slugify_heading_display(value)
