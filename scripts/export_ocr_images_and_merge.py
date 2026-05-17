#!/usr/bin/env python3
"""
Export embedded data-URI images from OCR markdown files into docs/images-01/
using the same filenames as docs/images/ (by order), then merge both MD files
with ![](images-01/...) references into Ispit Voznje Za Desetku (sa slikama).md
"""
from __future__ import annotations

import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
REF_IMG_DIR = DOCS / "images"
OUT_IMG_DIR = DOCS / "images-01"
OCR_PARTS = [
    DOCS / "Ispit Voznje Za Desetku-1-100-ocr.md",
    DOCS / "Ispit Voznje Za Desetku-101-129.md",
]
MERGED = DOCS / "Ispit Voznje Za Desetku (sa slikama).md"

# Embedded image: ![](data:image/png;base64,....)
DATA_URI = re.compile(
    r"^!\[\]\(data:image/(?P<fmt>png|jpeg|jpg);base64,(?P<b64>[A-Za-z0-9+/=\s]+)\)\s*$"
)


def reference_filenames() -> list[str]:
    files = list(REF_IMG_DIR.glob("*.png"))

    def key(p: Path) -> tuple[int, str]:
        m = re.match(r"^(\d+)-", p.name)
        return (int(m.group(1)), p.name) if m else (99999, p.name)

    return [p.name for p in sorted(files, key=key)]


def strip_embedded_image(line: str) -> tuple[str | None, bytes | None, str]:
    """If line is data-URI image, return (replacement_md, raw_bytes, ext). Else (None, None, '')."""
    m = DATA_URI.match(line.strip())
    if not m:
        return None, None, ""
    b64 = re.sub(r"\s+", "", m.group("b64"))
    raw = base64.b64decode(b64, validate=False)
    fmt = m.group("fmt").lower()
    ext = ".png" if fmt == "png" else ".jpg"
    return None, raw, ext  # replacement filled by caller


def main() -> None:
    names = reference_filenames()
    if not names:
        raise SystemExit(f"No reference PNGs in {REF_IMG_DIR}")

    OUT_IMG_DIR.mkdir(parents=True, exist_ok=True)

    merged_chunks: list[str] = []
    img_i = 0
    total_lines_out = 0

    header = (
        "---\n"
        "title: \"Ispit vožnje za desetku\"\n"
        "subtitle: \"Poznavanje saobraćajnih propisa — kategorije A, B, C i D\"\n"
        "lang: sr-Latn\n"
        "variant: izdanje-sa-slikama\n"
        "---\n\n"
        "> **Izdanje sa slikama.** Ilustracije su u fascikli `"
        f"{OUT_IMG_DIR.name}/` (ista imenovanja kao u `images/`). "
        "Sadržaj spaja `Ispit Voznje Za Desetku-1-100-ocr.md` i "
        "`Ispit Voznje Za Desetku-101-129.md`. Tekst je na srpskoj latinici "
        "uz uobičajene OCR ispravke.\n\n"
        "---\n\n"
    )
    merged_chunks.append(header)

    for part_path in OCR_PARTS:
        if not part_path.exists():
            raise SystemExit(f"Missing: {part_path}")
        merged_chunks.append(f"## Izvor: `{part_path.name}`\n\n")
        with part_path.open(encoding="utf-8", errors="replace") as f:
            for line in f:
                total_lines_out += 1
                stripped = line.rstrip("\n")
                m = DATA_URI.match(stripped.strip())
                if m:
                    if img_i >= len(names):
                        raise SystemExit(
                            f"More embedded images than reference files ({len(names)}); at image #{img_i + 1}"
                        )
                    b64 = re.sub(r"\s+", "", m.group("b64"))
                    raw = base64.b64decode(b64, validate=False)
                    out_name = names[img_i]
                    out_path = OUT_IMG_DIR / out_name
                    out_path.write_bytes(raw)
                    rel = f"{OUT_IMG_DIR.name}/{out_name}"
                    merged_chunks.append(f"![]({rel})\n")
                    img_i += 1
                else:
                    merged_chunks.append(line if line.endswith("\n") else line + "\n")

        merged_chunks.append("\n")

    MERGED.write_text("".join(merged_chunks), encoding="utf-8")

    print(f"Wrote {img_i} image files to {OUT_IMG_DIR}")
    print(f"Reference list had {len(names)} names")
    if img_i != len(names):
        print(f"Warning: extracted count {img_i} != reference count {len(names)}")
    print(f"Merged markdown: {MERGED} (lines processed ~{total_lines_out})")


if __name__ == "__main__":
    main()
