# HOJAI Docs Site (`docs.hojai.ai`)

> Static site generator for the HOJAI developer platform docs.

## What it does

Scans all `@hojai/*` SDK directories in `../sdk/` for their `CLAUDE.md` + `README.md` and emits a complete static site at `./public`:

- **Homepage** (`/`) — featured SDKs + full grid of all 20+ SDKs
- **Quickstart** (`/quickstart.html`) — 5-minute getting started
- **AI-native spec** (`/ai-native.html`) — what `hojai.ai.md` is and why it matters
- **CLI reference** (`/cli.html`) — every `hojai` command with examples
- **Per-SDK pages** (`/sdks/<name>.html`) — one per `@hojai/*` package, auto-generated from CLAUDE.md
- **Machine-readable manifest** (`/manifest.json`) — for tooling that wants to introspect the SDK list

All 28 pages are pre-rendered. The site is **fully static** — no server runtime needed. Deploy anywhere (GitHub Pages, S3, Netlify, etc.).

## Why no framework

The site is built with **vanilla HTML + CSS + a 200-line Node build script**. Zero npm dependencies, zero build step at deploy time. The Node script is the only runtime — and it uses stdlib only (`fs`, `path`, `http`).

This matters because:
- The site is 464 KB total — loads in < 1 second on any connection
- Zero supply chain attack surface (no `node_modules` in production)
- Deploys to anywhere static files work
- Won't break when npm is down

## Quick start

```bash
# Build the site
npm run build

# Build + serve at http://localhost:4400
npm run dev

# Run the test suite (9 tests, ~1.6s)
npm test
```

Output:
```
public/
├── index.html              (homepage)
├── quickstart.html
├── cli.html
├── ai-native.html
├── manifest.json           (machine-readable)
├── assets/
│   └── style.css
└── sdks/                   (one .html per SDK)
    ├── foundation.html
    ├── cli.html
    ├── ai-spec.html
    ├── razor.html
    └── ... (20 total)
```

## How it works

The build script (`src/build.mjs`):

1. **Discovers** all `hojai-*/` dirs under `../sdk/` that have a `CLAUDE.md` or `README.md`
2. **Extracts** package metadata (`name`, `version`, `description`) from each `package.json`
3. **Runs** the `@hojai/cli` binary to capture `hojai help` output for the CLI reference page
4. **Renders** markdown to HTML with a minimal md-to-html converter (no marked/markdown-it — stdlib only)
5. **Emits** HTML pages wrapped in a shared shell (sidebar + dark theme)
6. **Writes** a `manifest.json` with machine-readable SDK list

The site has **zero JavaScript on the client** — just CSS. No React, no Vue, no hydration. The most boring possible web stack.

## Adding a new SDK to the site

The site auto-discovers SDKs. To add a new one:

1. Create `../sdk/hojai-foo/` with a `package.json` and either a `CLAUDE.md` or `README.md`
2. Run `npm run build`
3. The new SDK appears in the sidebar + gets its own page at `/sdks/foo.html`

That's it. No registration step, no manual config.

## Files

```
docs/site/
├── README.md                  # This file
├── CLAUDE.md                  # Detailed doc for AI assistants
├── package.json               # Build script + test runner
├── src/
│   ├── build.mjs              # The site generator (one file, ~600 LOC)
│   └── __tests__/
│       └── build.test.mjs     # 9 tests
└── public/                    # Generated — do not edit
    ├── *.html
    ├── assets/style.css
    └── sdks/*.html
```

## License

MIT — site code generated. SDK content (CLAUDE.md, README.md) is owned by each respective SDK package.
