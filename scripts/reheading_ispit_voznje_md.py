#!/usr/bin/env python3
"""
Reassign heading levels in the driving-theory markdown and regenerate ## Sadržaj.

H2  = Izvor / Sadržaj, or all-uppercase titles (Latin + Serbian diacritics),
      excluding known continuations and false positives.
H3  = everything else that was ## (sentence-style subsections).

TOC lists H1 and H2 only (nested under the document H1).
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

DOC = Path(__file__).resolve().parent.parent / "docs" / "Ispit Voznje Za Desetku (sa slikama).md"

DENY_ALL_CAPS_H2 = frozenset(
    {
        "JEDAN KRATAK ZVIZDUK",
        "VIŠE UZASTOPNIH ZVIZDUKA",
        "U OBA SLUČAJA VRŠI SE UVIDAJ SAOBRAĆAJNE NEZGODE",
        "NIJE DOZVOLJENO DA SE VRŠI PREVOZ LICA:",
    }
)

# All-caps lines denied as H2, but nested under „Zvučni znaci“ in this book → H4.
H4_UNDER_MIXED_PARENT = frozenset({"JEDAN KRATAK ZVIZDUK", "VIŠE UZASTOPNIH ZVIZDUKA"})


def letters(s: str) -> list[str]:
    return [c for c in s if c.isalpha()]


def is_all_upper_title(t: str) -> bool:
    lets = letters(t)
    if not lets:
        return False
    return all(c.isupper() for c in lets)


def extra_deny_h2(t: str) -> bool:
    if t.startswith("I PUTU REZERVISANOM"):
        return True
    if re.match(r"^\d+\.\s", t):
        return True
    if t.startswith("i NE SMEJU"):
        return True
    return False


def is_h2_heading(text: str) -> bool:
    if text.startswith("Izvor:") or text == "Sadržaj":
        return True
    if text in DENY_ALL_CAPS_H2 or extra_deny_h2(text):
        return False
    return is_all_upper_title(text)


def slugify(title: str) -> str:
    t = title.strip().lower().replace("`", "")
    out: list[str] = []
    for c in t:
        if c.isalnum():
            out.append(c)
        elif c in " -–—":
            out.append("-")
    s = "".join(out)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "section"


def build_toc_lines(h1_title: str, h2_titles: list[str]) -> list[str]:
    used: dict[str, int] = {}

    def anchor_for(title: str) -> str:
        base = slugify(title)
        n = used.get(base, 0)
        used[base] = n + 1
        return base if n == 0 else f"{base}-{n}"

    h1_slug = anchor_for(h1_title)
    lines = ["## Sadržaj", ""]
    lines.append(f"- [{h1_title}](#{h1_slug})")
    for t in h2_titles:
        if t == "Sadržaj":
            continue
        slug = anchor_for(t)
        lines.append(f"  - [{t}](#{slug})")
    lines.append("")
    return lines


def main() -> None:
    raw = DOC.read_text(encoding="utf-8")
    lines = raw.splitlines(keepends=True)

    out: list[str] = []
    h1_title: str | None = None
    h2_for_toc: list[str] = []

    atx_h2 = re.compile(r"^## (?![#])")

    for line in lines:
        if line.startswith("# ") and not line.startswith("##"):
            title = line[2:].strip()
            if h1_title is None:
                h1_title = title
            out.append(line)
            continue

        if atx_h2.match(line):
            title = line[3:].strip()
            if is_h2_heading(title):
                out.append(line)
                h2_for_toc.append(title)
            else:
                prefix = "#### " if title in H4_UNDER_MIXED_PARENT else "### "
                out.append(prefix + line[3:])
            continue

        out.append(line)

    if not h1_title:
        raise SystemExit("No H1 found")

    # Idempotent: zvižduci su uvek H4 ispod „Zvučni znaci“ (raniji prolazi su ih ostavili na ###).
    zviz = frozenset({"### JEDAN KRATAK ZVIZDUK", "### VIŠE UZASTOPNIH ZVIZDUKA"})
    for i, line in enumerate(out):
        key = line.rstrip("\r\n")
        if key in zviz:
            out[i] = "#" + line

    text = "".join(out)
    out_lines = text.splitlines(keepends=True)

    toc_start: int | None = None
    toc_end: int | None = None
    for i, ln in enumerate(out_lines):
        if ln.rstrip("\n") == "## Sadržaj":
            toc_start = i
            break
    if toc_start is None:
        raise SystemExit("## Sadržaj not found")

    atx_h2 = re.compile(r"^## (?![#])")
    for j in range(toc_start + 1, len(out_lines)):
        ln = out_lines[j]
        if atx_h2.match(ln):
            toc_end = j
            break
    if toc_end is None:
        raise SystemExit("Could not find end of TOC block")

    new_toc = [ln if ln.endswith("\n") else ln + "\n" for ln in build_toc_lines(h1_title, h2_for_toc)]
    final = out_lines[:toc_start] + new_toc + out_lines[toc_end:]

    DOC.write_text("".join(final), encoding="utf-8")
    print(f"Wrote {DOC}")
    print(f"H1: 1; H2 in TOC: {len(h2_for_toc)}")


if __name__ == "__main__":
    main()
