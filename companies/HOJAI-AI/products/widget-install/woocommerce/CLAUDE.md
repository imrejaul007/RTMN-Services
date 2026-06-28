# WooCommerce Extension

**Type:** WordPress/WooCommerce Plugin
**Purpose:** HOJAI SiteOS integration for WooCommerce stores
**Version:** 1.0.0

## What It Does

- Renders HOJAI widget on WooCommerce pages
- Tracks all commerce events (add to cart, checkout, purchase, refund)
- Provides REST API for product/order data
- Syncs with HOJAI SiteOS

## Features

- Add to Cart tracking
- Checkout Start tracking
- Purchase Complete tracking
- Refund tracking
- Product data API
- Order data API
- Cart data API
- Admin settings page

## Files

| File | Purpose |
|---|---|
| `hojai-woocommerce.php` | Main plugin (complete, production-ready) |

## Installation

1. Upload to `/wp-content/plugins/hojai-woocommerce/`
2. Activate in WordPress admin
3. Enter API key in Settings > HOJAI SiteOS
4. Widget appears on all pages

## REST API

| Endpoint | Method | Description |
|---|---|---|
| `/wp-json/hojai-wc/v1/config` | GET | Get store config |
| `/wp-json/hojai-wc/v1/products` | GET | Get products |
| `/wp-json/hojai-wc/v1/orders` | GET | Get orders |
| `/wp-json/hojai-wc/v1/cart` | GET | Get current cart |

## Hooks

| Hook | Description |
|---|---|
| `woocommerce_add_to_cart` | Tracks add to cart events |
| `woocommerce_checkout_order_processed` | Tracks purchases |
| `woocommerce_order_status_changed` | Tracks refunds |
