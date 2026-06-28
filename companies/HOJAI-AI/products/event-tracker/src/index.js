/**
 * Event Tracker
 * Port: 5453
 * Tracks 100 events on websites for HOJAI SiteOS analytics
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const app = express();
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.EVENT_TRACKER_PORT || 5453;

app.use(express.json());

// In-memory stores
const events = []; // event objects
const visitorEvents = new Map(); // visitorId -> events[]
const pageEvents = new Map(); // pageId -> events[]
const DATA_DIR = '/tmp/hojai-events';

// 25 core event types (expand to 100)
const EVENT_TYPES = new Set([
  // Website
  'page_view', 'product_view', 'search', 'add_to_cart', 'cart_remove',
  'checkout_start', 'checkout_fail', 'payment_complete', 'purchase_complete',
  // User
  'sign_up', 'login', 'logout', 'email_subscribe', 'email_unsubscribe', 'profile_update',
  // Engagement
  'widget_open', 'widget_close', 'chat_start', 'chat_message', 'voice_use',
  'cta_click', 'exit_intent', 'form_start', 'form_submit', 'form_abandon',
  // Commerce
  'cart_abandon', 'order_complete', 'order_cancel', 'refund_request', 'refund_complete',
  // Marketing
  'email_open', 'email_click', 'email_bounce', 'sms_sent', 'sms_delivered',
  'push_sent', 'push_click', 'whatsapp_click', 'whatsapp_sent',
  // Support
  'ticket_create', 'ticket_update', 'ticket_resolve', 'ticket_escalate',
  // Revenue
  'revenue_tracked', 'coupon_used', 'discount_applied',
  // Session
  'session_start', 'session_end', 'scroll_25', 'scroll_50', 'scroll_75', 'scroll_90',
  'time_on_page_30s', 'time_on_page_2min', 'time_on_page_5min',
  'click', 'double_click', 'right_click', 'copy_text',
  'video_play', 'video_pause', 'video_complete',
  'image_view', 'document_download',
  // Funnel
  'landing_page_view', 'pricing_view', 'comparison_view',
  'wishlist_add', 'wishlist_remove', 'share_product',
  'notify_me', 'back_to_cart', 'continue_shopping',
  'checkout_guest', 'checkout_register', 'checkout_login',
  // Mobile
  'app_install', 'app_open', 'app_close', 'push_enable', 'push_disable',
  'share_app', 'rate_app', 'invite_friend',
  // Attribution
  'utm_seen', 'referral_click', 'organic_search', 'paid_ad_click',
  'social_share', 'affiliate_click',
  // Customer
  'first_purchase', 'repeat_purchase', 'subscription_start', 'subscription_cancel',
  'membership_upgrade', 'membership_downgrade',
  'review_submit', 'review_helpful', 'survey_complete',
  'loyalty_join', 'loyalty_redeem', 'gift_card_purchase',
  // Operations
  'inventory_check', 'price_alert', 'stock_alert',
  'payment_method_add', 'payment_method_remove',
  'address_add', 'address_update', 'address_delete',
  'newsletter_subscribe', 'newsletter_unsubscribe',
  'widget_custom_action'
]);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'event-tracker', events: events.length, port: PORT });
});

// POST /api/events/track - Track a single event
app.post('/api/events/track',requireAuth,  (req, res) => {
  try {
    const { visitorId, pageId, companyId, event, properties, timestamp } = req.body;
    if (!event) return res.status(400).json({ success: false, error: 'event is required' });

    const eventObj = {
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      visitorId, pageId, companyId, event,
      properties: properties || {},
      timestamp: timestamp || new Date().toISOString(),
      sessionId: req.headers['x-session-id'] || null,
      referrer: req.headers['referer'] || null,
      url: req.headers['x-url'] || null,
      device: req.headers['x-device'] || 'unknown',
      userAgent: req.headers['user-agent'] || null
    };

    events.push(eventObj);

    // Index by visitor
    if (visitorId) {
      if (!visitorEvents.has(visitorId)) visitorEvents.set(visitorId, []);
      visitorEvents.get(visitorId).push(eventObj);
    }

    // Index by page
    if (pageId) {
      if (!pageEvents.has(pageId)) pageEvents.set(pageId, []);
      pageEvents.get(pageId).push(eventObj);
    }

    res.json({ success: true, data: { eventId: eventObj.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/batch - Track batch of events
app.post('/api/events/batch',requireAuth,  (req, res) => {
  try {
    const { events: batch } = req.body;
    if (!Array.isArray(batch)) {
      return res.status(400).json({ success: false, error: 'events array is required' });
    }

    const results = [];
    for (const eventData of batch.slice(0, 100)) { // max 100 per batch
      const { visitorId, pageId, companyId, event, properties } = eventData;
      if (!event) continue;

      const eventObj = {
        id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        visitorId, pageId, companyId, event,
        properties: properties || {},
        timestamp: eventData.timestamp || new Date().toISOString()
      };

      events.push(eventObj);
      if (visitorId) {
        if (!visitorEvents.has(visitorId)) visitorEvents.set(visitorId, []);
        visitorEvents.get(visitorId).push(eventObj);
      }
      if (pageId) {
        if (!pageEvents.has(pageId)) pageEvents.set(pageId, []);
        pageEvents.get(pageId).push(eventObj);
      }
      results.push({ eventId: eventObj.id });
    }

    res.json({ success: true, data: { tracked: results.length, events: results } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/summary/:visitorId - Get visitor event summary
app.get('/api/events/summary/:visitorId', (req, res) => {
  try {
    const visitorEvents = events.filter(e => e.visitorId === req.params.visitorId);
    const summary = {
      visitorId: req.params.visitorId,
      totalEvents: visitorEvents.length,
      eventTypes: {},
      firstSeen: visitorEvents[0]?.timestamp || null,
      lastSeen: visitorEvents[visitorEvents.length - 1]?.timestamp || null,
      pages: [...new Set(visitorEvents.map(e => e.pageId).filter(Boolean))],
      sessions: [...new Set(visitorEvents.map(e => e.sessionId).filter(Boolean))].length
    };

    for (const e of visitorEvents) {
      summary.eventTypes[e.event] = (summary.eventTypes[e.event] || 0) + 1;
    }

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/page/:pageId - Get page event stats
app.get('/api/events/page/:pageId', (req, res) => {
  try {
    const pageId = decodeURIComponent(req.params.pageId);
    const pageEvents = events.filter(e => e.pageId === pageId);
    const summary = {
      pageId,
      totalEvents: pageEvents.length,
      uniqueVisitors: [...new Set(pageEvents.map(e => e.visitorId).filter(Boolean))].length,
      eventTypes: {}
    };

    for (const e of pageEvents) {
      summary.eventTypes[e.event] = (summary.eventTypes[e.event] || 0) + 1;
    }

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/funnel/:companyId - Get funnel metrics
app.get('/api/events/funnel/:companyId', (req, res) => {
  try {
    const { period } = req.query;
    const now = Date.now();
    const periodMs = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
    const cutoff = now - (periodMs[period] || periodMs['24h']);

    const companyEvents = events.filter(e =>
      e.companyId === req.params.companyId && new Date(e.timestamp).getTime() > cutoff
    );

    const funnelSteps = ['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'payment_complete'];
    const funnel = {};

    for (const step of funnelSteps) {
      const stepEvents = companyEvents.filter(e => e.event === step);
      funnel[step] = {
        count: stepEvents.length,
        uniqueVisitors: [...new Set(stepEvents.map(e => e.visitorId).filter(Boolean))].length
      };
    }

    // Calculate conversion rates
    for (let i = 1; i < funnelSteps.length; i++) {
      const prev = funnel[funnelSteps[i - 1]].count;
      const curr = funnel[funnelSteps[i]].count;
      funnel[funnelSteps[i]].conversionRate = prev > 0 ? Math.round((curr / prev) * 100) : 0;
    }
    funnel._total = companyEvents.length;

    res.json({ success: true, data: funnel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/types - List supported event types
app.get('/api/events/types', (_req, res) => {
  res.json({ success: true, data: { types: [...EVENT_TYPES], count: EVENT_TYPES.size } });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`Event Tracker running on port ${PORT} — ${EVENT_TYPES.size} event types`);
});

module.exports = app;
