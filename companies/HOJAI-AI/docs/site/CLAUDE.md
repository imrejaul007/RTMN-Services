# CLAUDE.md — HOJAI Docs Site Generator

> **Path:** `docs/site/`
> **Status:** ✅ **v1.0.0 — production-ready, zero runtime deps**
> **Output:** `./public/` — 28 static files, 464 KB total

## What this is

A single-file Node script (`src/build.mjs`) that scans the SDK family and emits a complete static site for `docs.hojai.ai`. No framework, no build step, no client JS — just HTML + CSS.

```
docs/site/
├── README.md                # User-facing docs
├── CLAUDE.md                # This file
├── package.json             # Build + test scripts
├── src/
│   ├── build.mjs            # The single-file generator
│   └── __tests__/
│       └── build.test.mjs   # 9 tests
└── public/                  # Generated — do not commit
```

## Quick commands

```bash
npm install        # nothing to install (zero deps!)
npm run build      # generate public/ from SDK CLAUDE.md files
npm run dev        # build + serve at http://localhost:4400
npm test           # run 9 tests in ~1.6s
```

## Architecture

### The build script (`src/build.mjs`)

~600 LOC of vanilla ESM, zero dependencies. It does:

1. **Discovers** all `hojai-*/` dirs in `../sdk/` that have a `CLAUDE.md` or `README.md`
2. **Reads** each SDK's `package.json` for name/version/description
3. **Extracts** a method count heuristic from CLAUDE.md (`/(\d+)\+?\s*methods?/`)
4. **Runs** `hojai help` (via `execSync`) and captures the output for the CLI reference page
5. **Renders** markdown → HTML with a minimal converter (h1-h6, code blocks, tables, lists, inline code, links, blockquotes)
6. **Emits** HTML pages wrapped in a shared shell (sidebar + dark theme CSS)
7. **Writes** `public/manifest.json` for tooling

### The serve mode

When called with `--serve`, runs an `http.createServer` that serves `./public/` on port 4400 (override with `PORT` env var). Returns 404 for missing files.

### The tests (`src/__tests__/build.test.mjs`)

9 tests, all run in ~1.6s:

1. Build script runs without error
2. Output dir has 4 core pages + assets + sdks/
3. Per-SDK page exists for every @hojai/* with CLAUDE.md or README.md
4. `manifest.json` is valid JSON with all SDKs
5. Homepage includes the 4 core navigation links
6. Homepage sidebar lists every discovered SDK
7. Every SDK page has a working back-link to homepage
8. Every SDK page mentions its name in the H1
9. Public dir is < 2 MB

## Why this design

### Zero dependencies

The site uses zero npm packages. All HTML rendering, markdown parsing, and CSS is hand-written or stdlib-based. This means:

- No `node_modules/` to install
- No supply chain risk
- No framework upgrade churn
- Static site = deploy anywhere

### Dark theme

The CSS is hand-rolled (~150 lines) — a dark mode by default with `--bg / --fg / --accent` color variables. No external CSS framework, no CDN, no JS for theming.

### Auto-discovery

Adding a new SDK is **zero work**:

1. Create `../sdk/hojai-foo/` with `package.json` + either `CLAUDE.md` or `README.md`
2. Run `npm run build`
3. The new SDK auto-appears in the sidebar + gets its own page

This means the site is always in sync with the SDK family — no manual registry to maintain.

## Public directory structure

```
public/
├── index.html              # Homepage
├── quickstart.html         # 5-min getting started
├── cli.html                # CLI reference (auto-rendered from `hojai help`)
├── ai-native.html          # What hojai.ai.md is and why it matters
├── manifest.json           # Machine-readable SDK list
├── assets/
│   └── style.css            # ~150 lines of hand-rolled dark theme CSS
└── sdks/
    ├── foundation.html
    ├── cli.html
    ├── ai-spec.html
    ├── razor.html
    ├── sutar.html
    ├── nexha.html
    ├── industry.html
    ├── memory.html
    ├── twin.html
    ├── skills.html
    ├── department.html
    ├── media.html
    ├── reputation.html
    ├── commerce.html
    ├── payment.html
    ├── marketplace.html
    ├── genie.html
    ├── discovery.html
    ├── bizora.html
    ├── whatsapp.html
    └── widget-core.html
```

20 SDK pages + 4 core pages + 1 manifest = 25 HTML/JSON files at the top level, + 20 SDK HTML files in sdks/ = 28 files total.

## How the markdown → HTML converter works

Inlined in `mdToHtml()` in `build.mjs` — ~80 lines that handle:

- `# h1` through `#### h4` (line-starting only)
- ` ``` ` code blocks with optional language tag
- `` `inline code` ``
- `**bold**` and `*italic*`
- `[text](url)` links
- `- item` and `1. item` lists
- `| col1 | col2 |` tables (with separator row ignored)
- `> blockquote`
- blank-line paragraph breaks

It's a **deliberately minimal** converter — handles 90% of what the SDK CLAUDE.md files contain without bringing in marked/markdown-it.

## CSS

`public/assets/style.css` (~150 lines):
- CSS variables for colors, fonts, spacing
- Sidebar layout (sticky, 280px wide, dark background)
- Main content (max-width 960px, generous padding)
- Card grid for SDK listings
- Code blocks with monospace + syntax-friendly colors
- Tables with alternating-row readability
- Mobile responsive (sidebar collapses on small screens)

## Extending the build

If you need to add a new page or section:

1. Add a new HTML-generating function in `build.mjs` (e.g. `pricingPageHtml()`)
2. Add a `pageShell({ ... })` call in `build()`
3. Write to `public/{name}.html`
4. Add a sidebar link in the `pageShell` function (or update the sidebar template)

## Deployment

The site is **pure static files** — deploy to:

- **GitHub Pages** — push `public/` to a `gh-pages` branch
- **Netlify / Vercel** — connect the repo, set publish dir to `public`, build command to `npm run build`
- **S3 + CloudFront** — `aws s3 sync public/ s3://docs.hojai.ai`
- **Any static host** — point it at `./public/`

No server runtime needed.

## See also

- [`README.md`](./README.md) — User-facing docs
- [`/sdk/hojai-ai-spec`](../sdk/hojai-ai-spec/) — The AI-native spec that powers the AI-context story
- [`/sdk/hojai-cli`](../sdk/hojai-cli/) — The CLI that this site documents

The site is the **public face** of all the SDK work — every commit to any `hojai-*/` package is reflected here within a build.
