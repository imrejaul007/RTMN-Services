# HOJAI Widget for WordPress

A single-file WordPress plugin — drop it in `wp-content/plugins/` and activate.

## Install

1. Copy [`wordpress/hojai-ai-widget.php`](./hojai-ai-widget.php) into your WordPress site's `wp-content/plugins/` directory
2. In WP Admin: **Plugins → Installed Plugins → HOJAI AI Widget → Activate**
3. Go to **Settings → HOJAI Widget** and paste your API key from [hojai.ai/widget](https://hojai.ai/widget)
4. Configure color, position, and assistant name
5. Save — widget appears site-wide immediately

## Features

- **Settings UI** under Settings → HOJAI Widget (API key, color, position, name, page targeting)
- **Per-page targeting** — show on all pages, front page only, or use shortcode
- **Shortcode** — `[hojai_widget]` for inline embed on any page/post
- **Shortcode overrides** — `[hojai_widget color="#FF0000" position="inline"]`
- **Settings link** on the plugin list page for quick access
- **Auto-fetching bundle** — loads `https://cdn.hojai.ai/widget.js` from HOJAI's CDN
- **WP Standards** — proper escaping, nonce-free (no admin actions), sanitized inputs

## File structure

```
wordpress/
├── hojai-ai-widget.php    # Single-file plugin
└── README.md              # This file
```

## WordPress.org plugin submission

For an official .org listing, the plugin will need:
- A `readme.txt` (WordPress format, slightly different from README.md)
- A unique plugin slug
- Tested-with header
- License: GPL-2.0-or-later (WordPress.org requirement) — for now we ship MIT, would need dual-licensing for .org

## Security notes

- API key stored in `wp_options` (unencrypted by default — fine for public keys starting with `pk_live_`)
- All user inputs sanitized via `sanitize_text_field`, `sanitize_hex_color`, etc.
- All output escaped via `esc_attr`, `esc_html`, `esc_url`
- No admin-only AJAX endpoints, no DB writes — read-only settings + frontend render