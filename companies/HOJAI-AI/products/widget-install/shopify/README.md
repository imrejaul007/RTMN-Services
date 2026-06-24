# HOJAI Widget for Shopify

Two install paths: **App Embed** (modern, recommended) or **theme.liquid snippet** (legacy).

## Method 1 — App Embed (recommended)

1. Sign up at **hojai.ai/widget** and copy your public API key (`pk_live_...`)
2. Copy [`shopify/hojai-widget.liquid`](./hojai-widget.liquid) into your theme's `sections/` directory
3. In your Shopify admin: **Online Store → Themes → Customize**
4. Click **App Embeds** (left sidebar) → enable **HOJAI AI Widget**
5. Configure API key, color, position, and assistant name
6. Save — widget appears site-wide immediately

## Method 2 — Manual snippet

If you don't have a Shopify Plus store or can't enable App Embeds, drop this directly into `layout/theme.liquid` just before `</body>`:

```liquid
<script
  src="https://cdn.hojai.ai/widget.js"
  data-key="pk_live_YOUR_KEY"
  data-company="{{ shop.permanent_domain }}"
  data-color="#3B82F6"
  data-name="{{ shop.name }} Assistant"
  defer
></script>
```

## Configuration via metafields (advanced)

Set these on your **Shop** metafields:

| Metafield | Type | Purpose |
|---|---|---|
| `hojai.api_key` | `single_line_text` | Public API key |
| `hojai.company_id` | `single_line_text` | Company ID (defaults to `{{ shop.permanent_domain }}`) |
| `hojai.color` | `color` | Widget color |
| `hojai.position` | `single_line_text` | `bottom-right` or `bottom-left` |
| `hojai.name` | `single_line_text` | Assistant display name |

Then update the Liquid template to read them (already supported out of the box).

## Shopify App Store submission

For an official Shopify App Store listing, see [examples/shopify-app/](../examples/shopify-app/) for the Remix-based app scaffold with OAuth, webhook subscriptions, and App Bridge.