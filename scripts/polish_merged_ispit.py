#!/usr/bin/env python3
"""Polish Ispit Voznje Za Desetku (sa slikama).md: layout + OCR fixes (normalize_ispit_voznje_md).
Image lines ![](images-01/...) are never dropped or altered."""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MERGED = ROOT / "docs" / "Ispit Voznje Za Desetku (sa slikama).md"

# One markdown image reference per line (as produced by export_ocr_images_and_merge.py)
IMG_LINE = re.compile(r"^\s*!\[\]\(images-01/[^)]+\)\s*$")


def _load_normalize():
    p = Path(__file__).resolve().parent / "normalize_ispit_voznje_md.py"
    spec = importlib.util.spec_from_file_location("normalize_ispit_voznje_md", p)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def count_image_lines(text: str) -> int:
    return sum(1 for line in text.splitlines() if IMG_LINE.match(line))


def strip_leading_space_non_images(text: str) -> str:
    out: list[str] = []
    for line in text.splitlines(keepends=True):
        if IMG_LINE.match(line.rstrip("\n")):
            out.append(line.rstrip("\r\n") + "\n")
            continue
        raw = line.rstrip("\n\r")
        nl = "\n"
        if not line.endswith("\n"):
            nl = ""
        out.append(raw.lstrip() + nl)
    return "".join(out)


def remove_standalone_page_digit_lines(text: str) -> str:
    """OCR often emits a bare '2' as page marker between blocks."""
    lines = text.splitlines(keepends=True)
    kept: list[str] = []
    for line in lines:
        if re.match(r"^\s*2\s*$", line.rstrip("\n")):
            continue
        kept.append(line)
    return "".join(kept)


def collapse_excess_blank_lines(text: str) -> str:
    return re.sub(r"\n{4,}", "\n\n\n", text)


def main() -> None:
    mod = _load_normalize()
    apply_normalizations = mod.apply_normalizations

    path = Path(sys.argv[1]) if len(sys.argv) > 1 else MERGED
    text = path.read_text(encoding="utf-8")

    n0 = count_image_lines(text)
    text = strip_leading_space_non_images(text)
    text = remove_standalone_page_digit_lines(text)
    text = collapse_excess_blank_lines(text)
    text = apply_normalizations(text)
    # normalize_ispit_voznje_md replaces "voznje"→"vožnje" everywhere; real filenames stay ASCII.
    text = text.replace(
        "`Ispit Vožnje Za Desetku-1-100-ocr.md`",
        "`Ispit Voznje Za Desetku-1-100-ocr.md`",
    )
    text = text.replace(
        "`Ispit Vožnje Za Desetku-101-129.md`",
        "`Ispit Voznje Za Desetku-101-129.md`",
    )

    n1 = count_image_lines(text)
    if n0 != n1:
        raise SystemExit(f"Image line count changed: {n0} -> {n1} (abort)")
    if n0 == 0:
        raise SystemExit("No image lines found; abort")

    path.write_text(text, encoding="utf-8")
    print(f"Wrote {path} ({n0} image lines preserved)")


if __name__ == "__main__":
    main()
