# HOJAI Shopify App

**Type:** Shopify OAuth App
**Purpose:** Real Shopify App Store app for HOJAI SiteOS

## What It Does

Real Shopify App that businesses install from the Shopify App Store. Uses OAuth 2.0 for secure authentication.

## Architecture

```
Shopify App Store
       ↓
OAuth 2.0 (stores tokens securely in HOJAI DB, NOT metafields)
       ↓
Embedded React Settings UI
       ↓
Widget renders on storefront via app embed
       ↓
Events flow to HOJAI SiteOS
```

## Files

| File | Purpose |
|---|---|
| `server/index.js` | Express server with Shopify API init |
| `server/routes/auth.js` | OAuth 2.0 flow |
| `server/routes/webhook.js` | Webhook handlers |
| `server/routes/widget.js` | Widget config API |
| `server/services/storage.js` | Secure token storage |
| `frontend/App.jsx` | React settings UI |
| `app-block/` | Checkout extension |

## Setup

```bash
npm install
npm run dev   # Development
npm run build # Production
npm start     # Run server
```

## Environment Variables

```
SHOPIFY_CLIENT_ID=xxx
SHOPIFY_CLIENT_SECRET=xxx
SHOPIFY_SCOPES=read_products,write_products,read_orders
SHOPIFY_APP_URL=https://your-app.ngrok.io
HOJAI_API_KEY=xxx
HOJAI_WIDGET_URL=https://cdn.hojai.ai
```
