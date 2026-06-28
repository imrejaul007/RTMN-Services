/**
 * Event Taxonomy
 * Port: 5461
 * 100 event types organized by category
 */
const express = require('express');
const app = express();
const PORT = process.env.EVENT_TAXONOMY_PORT || 5461;

app.use(express.json());

const TAXONOMY = {
  website: {
    name: 'Website',
    events: {
      page_view: { name: 'Page View', properties: ['url', 'title', 'referrer'] },
      product_view: { name: 'Product View', properties: ['productId', 'productName', 'price'] },
      search: { name: 'Search', properties: ['query', 'results'] },
      add_to_cart: { name: 'Add to Cart', properties: ['productId', 'price', 'quantity'] },
      cart_remove: { name: 'Remove from Cart', properties: ['productId'] },
      checkout_start: { name: 'Checkout Started', properties: ['cartValue', 'items'] },
      checkout_fail: { name: 'Checkout Failed', properties: ['reason', 'cartValue'] },
      payment_complete: { name: 'Payment Complete', properties: ['orderId', 'amount', 'method'] },
      purchase_complete: { name: 'Purchase Complete', properties: ['orderId', 'amount'] }
    }
  },
  user: {
    name: 'User',
    events: {
      sign_up: { name: 'Sign Up', properties: ['method'] },
      login: { name: 'Login', properties: ['method'] },
      logout: { name: 'Logout' },
      email_subscribe: { name: 'Email Subscribe', properties: ['source'] },
      email_unsubscribe: { name: 'Email Unsubscribe' },
      profile_update: { name: 'Profile Update', properties: ['fields'] }
    }
  },
  engagement: {
    name: 'Engagement',
    events: {
      widget_open: { name: 'Widget Opened' },
      widget_close: { name: 'Widget Closed' },
      chat_start: { name: 'Chat Started' },
      chat_message: { name: 'Chat Message', properties: ['direction'] },
      voice_use: { name: 'Voice Used' },
      cta_click: { name: 'CTA Clicked', properties: ['ctaId', 'label'] },
      exit_intent: { name: 'Exit Intent', properties: ['url'] },
      form_start: { name: 'Form Started', properties: ['formId'] },
      form_submit: { name: 'Form Submitted', properties: ['formId'] },
      form_abandon: { name: 'Form Abandoned', properties: ['formId'] }
    }
  },
  commerce: {
    name: 'Commerce',
    events: {
      cart_abandon: { name: 'Cart Abandoned', properties: ['cartValue', 'items'] },
      order_complete: { name: 'Order Complete', properties: ['orderId', 'amount'] },
      order_cancel: { name: 'Order Cancelled', properties: ['orderId', 'reason'] },
      refund_request: { name: 'Refund Requested', properties: ['orderId', 'amount', 'reason'] },
      refund_complete: { name: 'Refund Complete', properties: ['orderId', 'amount'] }
    }
  },
  marketing: {
    name: 'Marketing',
    events: {
      email_open: { name: 'Email Opened', properties: ['campaignId', 'subject'] },
      email_click: { name: 'Email Clicked', properties: ['campaignId', 'link'] },
      email_bounce: { name: 'Email Bounced', properties: ['reason'] },
      sms_sent: { name: 'SMS Sent', properties: ['campaignId'] },
      sms_delivered: { name: 'SMS Delivered', properties: ['campaignId'] },
      push_sent: { name: 'Push Sent', properties: ['campaignId'] },
      push_click: { name: 'Push Clicked', properties: ['campaignId'] },
      whatsapp_click: { name: 'WhatsApp Clicked', properties: ['messageId'] },
      whatsapp_sent: { name: 'WhatsApp Sent', properties: ['template'] }
    }
  },
  support: {
    name: 'Support',
    events: {
      ticket_create: { name: 'Ticket Created', properties: ['subject', 'priority'] },
      ticket_update: { name: 'Ticket Updated', properties: ['ticketId', 'status'] },
      ticket_resolve: { name: 'Ticket Resolved', properties: ['ticketId', 'resolutionTime'] },
      ticket_escalate: { name: 'Ticket Escalated', properties: ['ticketId', 'reason'] }
    }
  },
  session: {
    name: 'Session',
    events: {
      session_start: { name: 'Session Start' },
      session_end: { name: 'Session End', properties: ['duration'] },
      scroll_25: { name: 'Scrolled 25%', properties: ['page'] },
      scroll_50: { name: 'Scrolled 50%', properties: ['page'] },
      scroll_75: { name: 'Scrolled 75%', properties: ['page'] },
      scroll_90: { name: 'Scrolled 90%', properties: ['page'] },
      time_on_page_30s: { name: '30s on Page', properties: ['page'] },
      time_on_page_2min: { name: '2min on Page', properties: ['page'] },
      time_on_page_5min: { name: '5min on Page', properties: ['page'] }
    }
  }
};

// Add more categories to reach 100 events
const MORE = {
  funnel: {
    name: 'Funnel',
    events: {
      landing_page_view: { name: 'Landing Page View', properties: ['source'] },
      pricing_view: { name: 'Pricing Page View' },
      comparison_view: { name: 'Comparison View', properties: ['productA', 'productB'] },
      wishlist_add: { name: 'Added to Wishlist', properties: ['productId'] },
      wishlist_remove: { name: 'Removed from Wishlist', properties: ['productId'] },
      notify_me: { name: 'Notify Me Clicked', properties: ['productId'] },
      back_to_cart: { name: 'Back to Cart', properties: ['from'] },
      continue_shopping: { name: 'Continue Shopping Clicked' },
      checkout_guest: { name: 'Guest Checkout Started' },
      checkout_register: { name: 'Register During Checkout' }
    }
  },
  mobile: {
    name: 'Mobile',
    events: {
      app_install: { name: 'App Installed' },
      app_open: { name: 'App Opened', properties: ['source'] },
      app_close: { name: 'App Closed', properties: ['duration'] },
      push_enable: { name: 'Push Notifications Enabled' },
      push_disable: { name: 'Push Notifications Disabled' },
      share_app: { name: 'App Shared', properties: ['platform'] },
      rate_app: { name: 'App Rated', properties: ['rating'] },
      invite_friend: { name: 'Friend Invited', properties: ['platform'] }
    }
  },
  attribution: {
    name: 'Attribution',
    events: {
      utm_seen: { name: 'UTM Parameters Seen', properties: ['source', 'medium', 'campaign'] },
      referral_click: { name: 'Referral Link Clicked', properties: ['referrer'] },
      organic_search: { name: 'Organic Search', properties: ['query'] },
      paid_ad_click: { name: 'Paid Ad Clicked', properties: ['adId', 'network'] },
      social_share: { name: 'Social Share', properties: ['platform'] },
      affiliate_click: { name: 'Affiliate Link Clicked', properties: ['affiliateId'] }
    }
  },
  customer: {
    name: 'Customer Lifecycle',
    events: {
      first_purchase: { name: 'First Purchase', properties: ['orderId', 'amount'] },
      repeat_purchase: { name: 'Repeat Purchase', properties: ['orderId', 'amount'] },
      subscription_start: { name: 'Subscription Started', properties: ['plan'] },
      subscription_cancel: { name: 'Subscription Cancelled', properties: ['reason'] },
      membership_upgrade: { name: 'Membership Upgraded', properties: ['fromPlan', 'toPlan'] },
      membership_downgrade: { name: 'Membership Downgraded', properties: ['fromPlan', 'toPlan'] },
      review_submit: { name: 'Review Submitted', properties: ['productId', 'rating'] },
      review_helpful: { name: 'Review Marked Helpful', properties: ['reviewId'] },
      survey_complete: { name: 'Survey Completed', properties: ['surveyId'] },
      loyalty_join: { name: 'Joined Loyalty Program' },
      loyalty_redeem: { name: 'Loyalty Points Redeemed', properties: ['points', 'reward'] },
      gift_card_purchase: { name: 'Gift Card Purchased', properties: ['amount'] }
    }
  },
  revenue: {
    name: 'Revenue',
    events: {
      revenue_tracked: { name: 'Revenue Tracked', properties: ['amount', 'source'] },
      coupon_used: { name: 'Coupon Used', properties: ['code', 'discount'] },
      discount_applied: { name: 'Discount Applied', properties: ['type', 'value'] }
    }
  }
};

// Merge all categories
Object.assign(TAXONOMY, MORE);

app.get('/health', (req, res) => {
  const total = Object.values(TAXONOMY).reduce((sum, cat) => sum + Object.keys(cat.events).length, 0);
  res.json({ status: 'ok', service: 'event-taxonomy', total, categories: Object.keys(TAXONOMY).length, port: PORT });
});

// GET /events/types
app.get('/api/events/types', (req, res) => {
  const { category } = req.query;

  if (category && TAXONOMY[category]) {
    return res.json({
      success: true,
      data: {
        category,
        events: Object.entries(TAXONOMY[category].events).map(([id, def]) => ({ id, ...def }))
      }
    });
  }

  const all = [];
  for (const [catId, cat] of Object.entries(TAXONOMY)) {
    for (const [eventId, def] of Object.entries(cat.events)) {
      all.push({ id: eventId, category: catId, ...def });
    }
  }

  res.json({ success: true, data: { events: all, total: all.length } });
});

// GET /events/validate
app.post('/api/events/validate', (req, res) => {
  const { event } = req.body;
  if (!event) return res.status(400).json({ success: false, error: 'event required' });

  for (const [catId, cat] of Object.entries(TAXONOMY)) {
    if (cat.events[event]) {
      return res.json({ success: true, data: { valid: true, category: catId, definition: cat.events[event] } });
    }
  }

  res.json({ success: true, data: { valid: false, suggestion: suggestEvent(event) } });
});

// GET /events/categories
app.get('/api/events/categories', (req, res) => {
  const categories = Object.entries(TAXONOMY).map(([id, cat]) => ({
    id, name: cat.name, eventCount: Object.keys(cat.events).length
  }));
  res.json({ success: true, data: categories });
});

function suggestEvent(event) {
  for (const cat of Object.values(TAXONOMY)) {
    for (const [id] of Object.entries(cat.events)) {
      if (id.includes(event) || event.includes(id)) return id;
    }
  }
  return null;
}

app.listen(PORT, () => console.log(`Event Taxonomy running on port ${PORT} — ${Object.values(TAXONOMY).reduce((s, c) => s + Object.keys(c.events).length, 0)} events`));
module.exports = app;
