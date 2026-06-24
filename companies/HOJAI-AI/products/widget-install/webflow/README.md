# HOJAI Widget for Webflow

Two install paths: **Custom Code in Project Settings** (recommended) or **per-page embed**.

## Method 1 — Project-wide Custom Code (recommended)

1. Sign up at **hojai.ai/widget** and copy your public API key (`pk_live_...`)
2. In Webflow Designer: **Project Settings → Custom Code → Head Code (or Footer Code)**
3. Paste the snippet below, replacing `pk_live_YOUR_KEY` with your actual key:

```html
<!-- HOJAI Widget -->
<script>
window.hojaiWidgetConfig = {
  apiKey: 'pk_live_YOUR_KEY',
  companyId: 'your-company-slug',
  color: '#3B82F6',
  position: 'bottom-right',
  name: 'Your Site Assistant'
};
</script>
<script src="https://cdn.hojai.ai/widget.js" defer></script>
```

4. Click **Save Changes** → **Publish** the site
5. Widget appears site-wide immediately

The widget reads `window.hojaiWidgetConfig` so you can change settings without touching the script tag.

## Method 2 — Per-page embed

For testing on a single page, paste this into the page's **Custom Code** section (in the Designer, click the page gear icon → Custom Code → Before `</body>` tag):

```html
<div id="hojai-chat" style="height:520px; max-width:400px; margin:0 auto;"></div>
<script src="https://cdn.hojai.ai/widget.js" defer></script>
<script>
window.addEventListener('load', function() {
  new window.HojaiWidget({
    apiKey: 'pk_live_YOUR_KEY',
    companyId: 'demo',
    containerId: '#hojai-chat'
  }).render();
});
</script>
```

This renders the chat panel inline on that specific page.

## Method 3 — Webflow App (Marketplace)

For an official Webflow Marketplace App listing, see [`examples/webflow-app/`](../../examples/webflow-app/) for the Designer Extension scaffold with OAuth, Data API integration, and Component library.

## File structure

```
webflow/
├── README.md          # This file
└── snippet.html       # Copy-paste snippet for project settings
```