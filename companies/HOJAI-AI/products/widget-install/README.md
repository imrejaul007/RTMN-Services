# HOJAI Widget Installers

Drop-in installers for the HOJAI AI Widget across the most popular website builders and CMS platforms.

## Installers

| Platform | Path | Install time | Difficulty |
|---|---|---|---|
| **Shopify** | [shopify/](shopify/) | 3 clicks (App Embed) or 30 sec (snippet) | Easy |
| **WordPress** | [wordpress/](wordpress/) | 1 minute (single-file plugin) | Easy |
| **Webflow** | [webflow/](webflow/) | 1 minute (paste into Custom Code) | Easy |
| **Vanilla HTML** | [examples/vanilla-html.html](../HOJAI-AI/products/widget-backend/demo/index.html) | 5 seconds | Trivial |

All installers use the same [`@hojai/widget-core`](../sdk/hojai-widget-core/) bundle (~5KB gzipped, no dependencies).

## Common pattern

Every installer wraps the same one-liner:

```html
<script src="https://cdn.hojai.ai/widget.js"
        data-key="pk_live_YOUR_KEY"
        data-company="your-company-id"
        defer></script>
```

The script tag auto-renders a floating chat bubble in the bottom-right corner. Click it → visitor types a message → backend routes to your SUTAR agents → natural-language reply back.

## Two config modes

The auto-init snippet supports two ways to pass config:

### Mode 1: data-* attributes (most common)

```html
<script src="https://cdn.hojai.ai/widget.js"
        data-key="pk_live_abc"
        data-company="maya-collective"
        data-color="#3B82F6"
        data-position="bottom-right"
        data-name="Maya Assistant"
        defer></script>
```

### Mode 2: window.hojaiWidgetConfig (for builders that don't allow data-* attrs)

```html
<script>
  window.hojaiWidgetConfig = {
    apiKey: 'pk_live_abc',
    companyId: 'maya-collective',
    color: '#3B82F6',
    position: 'bottom-right',
    name: 'Maya Assistant'
  };
</script>
<script src="https://cdn.hojai.ai/widget.js" defer></script>
```

Used by the Webflow installer. data-* attributes take precedence when both are set.

## What happens at runtime

1. Browser loads `widget.js` from HOJAI CDN
2. Snippet reads config (from data-* attrs or window.hojaiWidgetConfig)
3. Constructs `HojaiWidget` instance, calls `render()`
4. Widget mounts chat bubble in DOM (no React/Vue/jQuery required)
5. Visitor types message → `POST {your-backend}/api/v1/widget/message`
6. Backend classifies intent (10 intents) → routes to SUTAR agent
7. Real agent or local builder produces natural-language reply
8. Widget renders reply in chat panel

## Configuration reference

| Option | Default | Purpose |
|---|---|---|
| `apiKey` / `data-key` | (required) | Public key (`pk_live_...`) from hojai.ai/widget |
| `companyId` / `data-company` | (required) | Your company identifier |
| `baseUrl` | `https://api.hojai.ai` | Override backend URL |
| `color` / `data-color` | `#3B82F6` | Primary widget color |
| `position` / `data-position` | `bottom-right` | `bottom-right` / `bottom-left` / `inline` |
| `name` / `data-name` | `HOJAI Assistant` | Display name in header |
| `language` / `data-lang` | `en` | ISO language code |
| `greeting` / `data-greeting` | (default greeting) | First message shown |

## API

After initialization, the widget instance is exposed as `window.HojaiWidgetInstance`:

```js
window.HojaiWidgetInstance.send('Hello!');
window.HojaiWidgetInstance.open();
window.HojaiWidgetInstance.close();
window.HojaiWidgetInstance.on('response', (msg) => console.log(msg));
```

Or programmatically without the snippet:

```js
new HojaiWidget({ apiKey, companyId, ... }).render();
```

## See also

- [@hojai/widget-core](../sdk/hojai-widget-core/) — the actual SDK
- [@hojai/widget-react](../sdk/hojai-widget-react/) — React wrapper
- [Widget Backend](../products/widget-backend/) — server side
- [HOJAI Widget Spec](../../../../.claude/plans/hojai-widget-spec.md) — full product spec