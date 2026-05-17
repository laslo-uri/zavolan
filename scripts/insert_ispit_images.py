#!/usr/bin/env python3
"""Insert ![](images/NNN-slug.png) using full OCR text blocks before each image."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MAIN = DOCS / "Ispit Voznje Za Desetku.md"
IMG_DIR = DOCS / "images"
OCR_FILES = [
    DOCS / "Ispit Voznje Za Desetku-1-100-ocr.md",
    DOCS / "Ispit Voznje Za Desetku-101-129.md",
]

IMAGE_LINE = re.compile(r"^!\[\]\(data:image/")


def sorted_pngs() -> list[Path]:
    files = list(IMG_DIR.glob("*.png"))

    def key(p: Path) -> tuple[int, str]:
        m = re.match(r"^(\d+)-", p.name)
        return (int(m.group(1)), p.name) if m else (99999, p.name)

    return sorted(files, key=key)


def fold_sr(s: str) -> str:
    out: list[str] = []
    for c in s:
        if c in "šŠ":
            out.append("s")
        elif c in "žŽ":
            out.append("z")
        elif c in "čČćĆ":
            out.append("c")
        elif c in "đĐ":
            out.append("d")
        else:
            out.append(c.lower())
    return "".join(out)


def squash_spaces(s: str) -> str:
    return re.sub(r"[ \t]+", " ", s.replace("\r\n", "\n"))


def parse_ocr_blocks() -> list[tuple[str, Path]]:
    """Each image: (full text block before it, png path)."""
    pngs = sorted_pngs()
    out: list[tuple[str, Path]] = []
    buf: list[str] = []
    i = 0
    for ocr_path in OCR_FILES:
        if not ocr_path.exists():
            raise SystemExit(f"Missing OCR file: {ocr_path}")
        with ocr_path.open(encoding="utf-8", errors="replace") as f:
            for line in f:
                if IMAGE_LINE.match(line) or (
                    line.startswith("![](") and "base64" in line[:200]
                ):
                    block = "\n".join(buf)
                    if i >= len(pngs):
                        raise SystemExit(f"More images in OCR than files ({len(pngs)})")
                    out.append((block, pngs[i]))
                    i += 1
                    buf = []
                else:
                    buf.append(line.rstrip("\n"))
    if i != len(pngs):
        print(f"Warning: OCR images={i}, png files={len(pngs)}")
    return out


def find_in_folded(main: str, needle_folded: str, start: int) -> int | None:
    if not needle_folded or len(needle_folded) < 8:
        return None
    fm = fold_sr(main)
    p = fm.find(needle_folded, start)
    if p == -1:
        return None
    return p + len(needle_folded)


def slug_search(main: str, png: Path, start: int) -> int | None:
    stem = png.stem
    m = re.match(r"^\d+-(.+)$", stem)
    if not m:
        return None
    phrase = m.group(1).replace("-", " ")
    fp = fold_sr(squash_spaces(phrase))
    if len(fp) < 6:
        return None
    fm = fold_sr(main)
    for length in range(len(fp), 5, -3):
        sub = fp[:length]
        p = fm.find(sub, start)
        if p != -1:
            return p + length
    return None


def find_insert_point(main: str, block: str, start: int, png: Path) -> int | None:
    if not block.strip():
        return start
    tail = squash_spaces(block)[-2000:].strip()
    if not tail:
        return start
    fa = fold_sr(tail)
    # Longest prefix of folded tail (OCR may diverge at start of block vs main)
    for n in range(len(fa), 24, -5):
        pref = fa[-n:]  # prefer end of block (closest to image)
        end = find_in_folded(main, pref, start)
        if end is not None:
            return end
    # Whole tail
    end = find_in_folded(main, fa, start)
    if end is not None:
        return end
    # Prefix from beginning of tail
    for n in range(min(120, len(fa)), 24, -5):
        pref = fa[:n]
        end = find_in_folded(main, pref, start)
        if end is not None:
            return end
    return slug_search(main, png, start)


def main() -> None:
    seq = parse_ocr_blocks()
    text = MAIN.read_text(encoding="utf-8")
    pos = 0
    inserted = 0
    failed: list[tuple[int, str]] = []
    for idx, (block, png) in enumerate(seq):
        rel = f"images/{png.name}"
        insertion = f"\n\n![]({rel})\n"
        at = find_insert_point(text, block, pos, png)
        if at is None:
            failed.append((idx + 1, png.name))
            # advance pos slightly to reduce re-using same missed match
            pos = min(pos + 1, len(text) - 1)
            continue
        text = text[:at] + insertion + text[at:]
        pos = at + len(insertion)
        inserted += 1
    MAIN.write_text(text, encoding="utf-8")
    print(f"Inserted {inserted} / {len(seq)} images into {MAIN}")
    if failed:
        print(f"Failed: {len(failed)}")
        for n, name in failed[:50]:
            print(f"  #{n} {name}")
        if len(failed) > 50:
            print(f"  ... +{len(failed) - 50} more")


if __name__ == "__main__":
    main()
