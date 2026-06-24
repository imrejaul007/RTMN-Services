# HOJAI Widget Installers

> **Status:** ✅ MVP complete. Shopify, WordPress, Webflow installers + Vanilla HTML snippet. Powered by [@hojai/widget-core](../sdk/hojai-widget-core/) (4.1KB gzipped).

## Files

```
widget-install/
├── README.md                         # Top-level installer guide
├── CLAUDE.md                         # This file
├── shopify/
│   ├── hojai-widget.liquid           # Shopify App Embed (theme section)
│   └── README.md
├── wordpress/
│   ├── hojai-ai-widget.php           # Single-file WordPress plugin
│   └── README.md
└── webflow/
    ├── snippet.html                  # Copy-paste snippet for project Custom Code
    └── README.md
```

## What's supported

| Platform | Method | Features |
|---|---|---|
| **Shopify** | App Embed (sections/) or theme.liquid snippet | Settings via theme customizer, metafields support |
| **WordPress** | Single-file plugin (wp-content/plugins/) | Settings UI, shortcode, per-page targeting |
| **Webflow** | Custom Code in Project Settings | `window.hojaiWidgetConfig` pattern, per-page inline embed |

## What all installers share

1. Single `<script src="https://cdn.hojai.ai/widget.js" defer></script>` tag
2. Two config modes (data-* attrs OR window.hojaiWidgetConfig)
3. Public API key (`pk_live_...`) — never store secrets client-side
4. Graceful degradation — if HOJAI backend is unreachable, widget shows "I'm having trouble" message

## Tests

Widget installer code is tested via:
- `@hojai/widget-core` tests (11/11 passing) — core SDK
- `widget-core` snippet tests (8/8 passing) — auto-init logic including both config modes
- `widget-backend` tests (66/66 passing) — server-side handlers

Installer-specific code (Shopify Liquid, WordPress PHP, Webflow snippet) is not unit-tested but follows documented patterns and can be manually verified in each platform.

## Marketplace submission paths

- **Shopify App Store**: scaffold at `examples/shopify-app/` (OAuth + App Bridge)
- **WordPress.org**: needs `readme.txt` + GPL-2.0 license (currently MIT)
- **Webflow Marketplace**: scaffold at `examples/webflow-app/` (Designer Extension)