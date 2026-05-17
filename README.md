# ZaVolan

Practice for the Serbian theoretical driving exam. Topic tree: `public/data.json`. Questions (`public/database/`) and handbook (`docs/`) are local only — not in this public repo.

## Layout

| Path               |                                                    |
| ------------------ | -------------------------------------------------- |
| `src/`             | Vite SPA                                           |
| `public/data.json` | Topic / subtopic tree                              |
| `public/database/` | Questions (local; see `public/database/README.md`) |
| `scripts/`         | Extract, image sync, handbook tooling              |
| `docs/`            | Handbook sources (local)                           |

## Commands

| Command                               |                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`                         | Dev server                                                                                   |
| `npm run build`                       | Build → `dist/`                                                                              |
| `npm run preview`                     | Serve `dist/`                                                                                |
| `npm run lint`                        | ESLint                                                                                       |
| `npm test`                            | Vitest                                                                                       |
| `npm run extract -- <folder> [limit]` | HTML scrape → `public/database/`                                                             |
| `npm run sync-images`                 | Numbered JPEGs in scrape folder → database                                                   |
| `npm run generate-counts`             | Refresh `counts.json`                                                                        |
| `npm run report-coverage`             | Subtopics with / without questions                                                           |
| `npm run manual:html`                 | Handbook HTML from local `docs/*.md`                                                         |
| `npm run generate-pwa-icons`          | Sharp: regenerate `public/pwa-*.png`, `apple-touch-icon.png`, `og-image.png` from `logo.svg` |

PWA/OG PNGs are committed so production deploy does not need Sharp. Regenerate branding assets after changing `logo.svg`:

```bash
npm run extract -- podoblast-1-3
npm run extract -- podoblast-1-3 20
npm run generate-counts
```

Details: [`public/database/README.md`](public/database/README.md). Deploy (e.g. Vercel) still needs `public/database/` on the host — supply it outside git.

**Production build:** set `VITE_SITE_URL=https://your-domain.example` (no trailing slash) so OpenGraph/Twitter image URLs are absolute for crawlers. Vercel: add it under Project → Settings → Environment Variables for Production.
