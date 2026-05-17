#!/usr/bin/env python3
"""
Generiše čitljiv HTML iz docs/Ispit Voznje Za Desetku (sa slikama).md.
- Sidra na naslovima ista pravila kao u md_heading_slug + markdown toc unique().
- Ne menja .md; slike ostaju kao images-01/... (relativno od docs/).
Pokretanje: python3 scripts/build_manual_html.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import markdown
from markdown.extensions.toc import TocExtension

_SCRIPT_DIR = Path(__file__).resolve().parent
_ROOT = _SCRIPT_DIR.parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from md_heading_slug import slugify_heading_display

DOC_MD = _ROOT / "docs" / "Ispit Voznje Za Desetku (sa slikama).md"
OUT_HTML = _ROOT / "docs" / "Ispit Voznje Za Desetku (sa slikama).html"

STYLE_BLOCK_RE = re.compile(
    r"<style\s+type=\"text/css\">.*?</style>\s*",
    re.DOTALL | re.IGNORECASE,
)


def _toc_slugify(value: str, separator: str) -> str:
    return slugify_heading_display(value)


def _parse_frontmatter(raw: str) -> tuple[dict[str, str], str]:
    if not raw.startswith("---"):
        return {}, raw
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.DOTALL)
    if not m:
        return {}, raw
    meta: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" not in line or line.strip().startswith("#"):
            continue
        k, _, v = line.partition(":")
        k, v = k.strip(), v.strip().strip('"')
        if v and not v.startswith(">"):
            meta[k] = v
    body = raw[m.end() :]
    return meta, body


def _css() -> str:
    return """
:root {
  --text: #1a1a1a;
  --muted: #5c5c5c;
  --border: #ddd;
  --bg: #faf9f7;
  --accent: #0b5fff;
}
* { box-sizing: border-box; }
html { font-size: 100%; }
body {
  margin: 0;
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--text);
  background: var(--bg);
}
.manual-wrap {
  max-width: 44rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
  background: #fff;
  box-shadow: 0 0 0 1px var(--border);
  min-height: 100vh;
}
h1 { font-size: 1.75rem; margin-top: 0; border-bottom: 2px solid var(--text); padding-bottom: 0.35rem; }
h2 { font-size: 1.35rem; margin-top: 2rem; color: #111; }
h3 { font-size: 1.15rem; margin-top: 1.5rem; }
h4, h5, h6 { font-size: 1.05rem; margin-top: 1.25rem; color: #222; }
p { margin: 0.65rem 0; }
ul, ol { margin: 0.5rem 0; padding-left: 1.35rem; }
blockquote {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border-left: 4px solid var(--accent);
  background: #f4f7fc;
  color: #222;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
  border: 1px solid var(--border);
  border-radius: 2px;
}
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.manual-meta {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 1.5rem;
}
@media print {
  body { background: #fff; }
  .manual-wrap { box-shadow: none; max-width: none; }
  a { color: #000; }
}
"""


def main() -> None:
    raw = DOC_MD.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(raw)
    body = STYLE_BLOCK_RE.sub("", body, count=1)

    title = meta.get("title", "Priručnik")
    subtitle = meta.get("subtitle", "")

    md = markdown.Markdown(
        extensions=[
            "extra",
            "sane_lists",
            TocExtension(
                marker="",
                slugify=_toc_slugify,
                separator="-",
                toc_depth="1-6",
                title="",
            ),
        ]
    )
    content_html = md.convert(body)

    html = f"""<!DOCTYPE html>
<html lang="{meta.get("lang", "sr-Latn")}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_html_escape(title)}</title>
  <meta name="description" content="{_html_escape(meta.get("description", subtitle)[:200])}" />
  <style type="text/css">{_css()}</style>
</head>
<body>
  <div class="manual-wrap">
    <header class="manual-meta">
      <strong>{_html_escape(title)}</strong>
      {f"<br /><span>{_html_escape(subtitle)}</span>" if subtitle else ""}
      <br /><small>HTML generisan iz Markdowna; slike: <code>images-01/</code> (relativno od ovog fajla).</small>
    </header>
    <main class="manual-content">
{content_html}
    </main>
  </div>
</body>
</html>
"""

    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT_HTML}")


def _html_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


if __name__ == "__main__":
    main()
