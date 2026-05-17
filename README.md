# ZaVolan

Practice for the Serbian theoretical driving exam. Topic tree: `public/data.json`. Questions (`public/database/`) and handbook (`docs/`) are local only — not in this public repo.

## Layout

| Path | |
|------|--|
| `src/` | Vite SPA |
| `public/data.json` | Topic / subtopic tree |
| `public/database/` | Questions (local; see `public/database/README.md`) |
| `scripts/` | Extract, image sync, handbook tooling |
| `docs/` | Handbook sources (local) |

## Commands

| Command | |
|---------|--|
| `npm run dev` | Dev server |
| `npm run build` | Build → `dist/` |
| `npm run preview` | Serve `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run extract -- <folder> [limit]` | HTML scrape → `public/database/` |
| `npm run sync-images` | Numbered JPEGs in scrape folder → database |
| `npm run generate-counts` | Refresh `counts.json` |
| `npm run report-coverage` | Subtopics with / without questions |
| `npm run manual:html` | Handbook HTML from local `docs/*.md` |

Build runs Sharp (`prebuild`) to refresh `public/pwa-*.png`, `apple-touch-icon.png`, and `og-image.png` from `logo.svg`. Those files are committed so production deploy does not need Sharp at install time.

```bash
npm run extract -- podoblast-1-3
npm run extract -- podoblast-1-3 20
npm run generate-counts
```

Details: [`public/database/README.md`](public/database/README.md). Deploy (e.g. Vercel) still needs `public/database/` on the host — supply it outside git.
