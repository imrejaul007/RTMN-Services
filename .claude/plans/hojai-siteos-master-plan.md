# HOJAI SiteOS — Master Plan
## The Autonomous Revenue Manager For Every Business

> **Synthesized from:** Original widget spec + User conversations (June 2026)
> **Status:** Planning complete — ready for implementation

---

## TL;DR — What This Is

**HOJAI SiteOS** is not a chatbot. It is an **AI operating system for businesses** that installs on any website and becomes the business's:

- **Digital Store Manager** — knows everything about the website, tracks every visitor, watches for abandoned carts, triggers automatic actions
- **AI Salesperson** — understands intent, personalizes offers, negotiates, closes deals
- **Marketing Automation Engine** — runs campaigns, recovers abandoned carts, sends WhatsApp/email/push
- **Customer Intelligence System** — builds Customer Twin, predicts churn, maximizes LTV
- **Revenue Command Center** — tells owners what's broken, why, and what to do about it

The **widget** is just one interface into this platform. The platform is the product.

---

## Positioning

> **"HOJAI SiteOS runs your business locally. Nexus connects your business to the global agent economy. DO App is one of the consumer entry points."**

| Product | What it is | Metaphor |
|---|---|---|
| **HOJAI SiteOS** | The platform behind the widget | The brain |
| **HOJAI Widget** | The face of SiteOS on any website | The salesperson |
| **Nexus Connect** | The layer to the global agent economy | The network |
| **DO App** | One consumer entry point into Nexus | The mall entrance |

---

## The Operating Loop (Core Product Logic)

Every feature maps to this loop:

```
OBSERVE  →  UNDERSTAND  →  PREDICT  →  RECOMMEND  →  EXECUTE  →  LEARN  →  OPTIMIZE
   ↑                                                                                 │
   └────────────────────────────── Feedback Loop ─────────────────────────────────────┘
```

This loop — not the chat UI — is the real product.

---

## Canonical Architecture

```
                                    CUSTOMER
                                        │
                    ┌──────────────────┴──────────────────┐
                    │         HOJAI WidgetOS              │
                    │  (chat, voice, product cards,        │
                    │   booking, checkout, human handoff)   │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │         HOJAI SiteOS               │
                    │                                    │
                    │  ┌─────────────┐  ┌────────────┐ │
                    │  │  SalesOS    │  │MarketingOS │ │
                    │  │  (leads,   │  │(campaigns, │ │
                    │  │   quotes)  │  │ automation) │ │
                    │  └─────────────┘  └────────────┘ │
                    │  ┌─────────────┐  ┌────────────┐ │
                    │  │ SupportOS   │  │ CommerceOS │ │
                    │  │  (orders,  │  │ (catalog,  │ │
                    │  │   refunds) │  │  pricing)  │ │
                    │  └─────────────┘  └────────────┘ │
                    │  ┌─────────────┐  ┌────────────┐ │
                    │  │ AnalyticsOS │  │CustomerOS  │ │
                    │  │ (heatmaps, │  │ (Customer  │ │
                    │  │  revenue)  │  │  Twin)     │ │
                    │  └─────────────┘  └────────────┘ │
                    │  ┌─────────────┐  ┌────────────┐ │
                    │  │  AdOS       │  │VoiceOS    │ │
                    │  │ (Meta, Google│ │(receptionist│ │
                    │  │  TikTok)   │  │ call center)│ │
                    │  └─────────────┘  └────────────┘ │
                    │  ┌─────────────┐  ┌────────────┐ │
                    │  │ ExperimentOS│  │ContentOS  │ │
                    │  │  (A/B test) │  │(auto-gen  │ │
                    │  └─────────────┘  │ content)  │ │
                    │  ┌─────────────┐  └────────────┘ │
                    │  │   SEOOS     │                  │
                    │  │ (technical) │                  │
                    │  └─────────────┘                  │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │         HOJAI Foundation            │
                    │                                    │
                    │  MemoryOS │ TwinOS │ FlowOS │      │
                    │  PolicyOS │ SUTAR OS │ CorpID │    │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │         Nexus Connect                │
                    │                                    │
                    │  Discovery │ Trust │ Reputation │   │
                    │  Federation │ Settlement │ Routing │ │
                    │  Agent Marketplace │ Global ID │     │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │    Global Agentic Economy            │
                    │                                    │
                    │  DO App │ Personal Agents │         │
                    │  Procurement Agents │ Corporate │     │
                    │  Travel Agents │ Healthcare Agents │  │
                    │  Third-Party Platforms │            │
                    └────────────────────────────────────┘
```

---

## Module Deep-Dive

### 1. WidgetOS — The Front Door

**What it does:** The visible widget on any website.

**Features:**
- [x] Basic chat bubble (partially built in `hojai-widget-core`)
- [ ] Product cards rendering (rich content — MISSING, P0)
- [ ] Booking slot selectors
- [ ] Quote blocks
- [ ] Voice input (STT built, TTS output MISSING)
- [ ] Voice output (TTS)
- [ ] Human handoff to live chat
- [ ] Personalized greetings ("Hi John, welcome back")
- [ ] Multi-language conversations (19 languages built, language switcher MISSING)
- [ ] Dark/light theme (MISSING)
- [ ] Exit intent detection
- [ ] Product recommendation cards
- [ ] Checkout helper
- [ ] Cart status overlay
- [ ] Mini CRM (quick customer lookup)

**Install targets:**
- [ ] JavaScript SDK (`@hojai/widget-core`) — 5KB gzipped (currently ~37KB, SIZE BUDGET VIOLATED)
- [ ] React SDK (`@hojai/widget-react`) — built
- [ ] Vue SDK — MISSING
- [ ] Angular SDK — MISSING
- [ ] Svelte SDK — MISSING
- [ ] React Native SDK — MISSING
- [ ] Flutter SDK — MISSING
- [ ] WordPress plugin (`hojai-ai-widget.php`) — built, needs security fixes
- [ ] Shopify app (Liquid snippet only, NOT a real OAuth app)
- [ ] WooCommerce extension — MISSING
- [ ] Wix marketplace app — MISSING
- [ ] Webflow integration — MISSING
- [ ] Magento module — MISSING
- [ ] Custom website: `<script src="https://cdn.hojai.ai/widget.js"></script>`

**Backend (`widget-backend`):**
- [ ] Persistence — currently in-memory Map, NEEDS MongoDB/MemoryOS
- [ ] SUTAR agent wiring — currently localhost stubs, NEEDS real endpoints
- [ ] BAM charging — MISSING
- [ ] TwinOS memory updates — MISSING
- [ ] Analytics tracking — MISSING
- [ ] WhatsApp webhook HMAC verification — MISSING (SECURITY RISK)
- [ ] Rate limiting — MISSING
- [ ] CORS whitelist — MISSING (currently wide open)
- [ ] Token validation store — MISSING (any `pk_live_*` accepted)
- [ ] FlowOS orchestration — MISSING

---

### 2. SalesOS — AI Salesperson

**What it does:** Works behind the scenes to convert visitors into buyers.

**Features:**
- [ ] Lead scoring (0-100 based on behavior signals)
- [ ] Purchase intent detection (Cold → Warm → Hot → Ready to Close)
- [ ] Intent signals tracked:
  - [ ] Pricing page visits
  - [ ] Repeat visits
  - [ ] Time on page
  - [ ] Product comparisons
  - [ ] Downloads
  - [ ] Exit intent
  - [ ] Cart additions
  - [ ] Company size inference
  - [ ] Traffic source
  - [ ] Device type
- [ ] Personalized outreach messages
- [ ] Upselling recommendations
- [ ] Cross-selling recommendations
- [ ] Dynamic offer generation
- [ ] Enterprise quote generation (bulk pricing)
- [ ] Negotiation engine (SUTAR integration)
- [ ] Sales funnel analytics
- [ ] AI sales recommendations ("offer 10% onboarding discount")
- [ ] Close date prediction
- [ ] Lost deal analysis

**Connectors needed:**
- [ ] CRM (Salesforce, HubSpot, Zoho)
- [ ] Email (Gmail, Outlook)
- [ ] Calendar (Google Calendar, Calendly)
- [ ] WhatsApp Business
- [ ] SMS (Twilio, MSG91)

---

### 3. MarketingOS — Autonomous Marketing Engine

**What it does:** Runs all marketing automatically. AI creates and optimizes campaigns.

**Automation features:**
- [ ] Email campaigns (Klaviyo-style)
  - [ ] Abandoned cart emails
  - [ ] Welcome series
  - [ ] Win-back campaigns
  - [ ] Birthday campaigns
  - [ ] Post-purchase follow-ups
  - [ ] Replenishment reminders
- [ ] WhatsApp campaigns
  - [ ] Abandoned cart recovery
  - [ ] Order confirmations
  - [ ] Delivery updates
  - [ ] Promotional offers
- [ ] SMS marketing
- [ ] Push notifications
- [ ] Loyalty campaigns
- [ ] VIP customer campaigns
- [ ] New product announcements

**Segmentation features:**
- [ ] VIP customers (top 5% by LTV)
- [ ] Churn risks (no purchase 60+ days)
- [ ] Cart abandoners
- [ ] High-value buyers
- [ ] New users
- [ ] Returning users
- [ ] First-time buyers
- [ ] Bulk buyers
- [ ] Win-back segments
- [ ] Lookalike audiences

**Personalization features:**
- [ ] Dynamic product recommendations
- [ ] AI-generated email copy
- [ ] Personalized subject lines
- [ ] Smart coupon generation
- [ ] Personalized landing pages
- [ ] Behavioral triggers

**AI Campaign features:**
- [ ] Autonomous campaign creation
- [ ] Audience selection
- [ ] Content generation
- [ ] Send time optimization
- [ ] A/B testing
- [ ] Performance optimization

---

### 4. CustomerOS — Customer Twin & Memory

**What it does:** Builds and maintains the Customer Twin. Knows everything about every customer.

**Customer Twin fields:**
```
Identity:
- Name, phone, email
- Company, role, location
- Device, browser, language
- Social profiles

Behavior:
- Purchase frequency
- Favorite categories
- Price sensitivity
- Coupon usage rate
- Response times
- Preferred channel (WhatsApp/email/SMS)
- Browsing patterns
- Session recordings

Relationship:
- Referrals made
- Family members
- Corporate connections
- Team affiliations

Predictive:
- Lifetime value (LTV)
- Churn probability
- Purchase probability
- Next best action
- Optimal contact time
- Product affinities
```

**Multi-channel identity:**
- [ ] Website visitor → known customer
- [ ] WhatsApp contact → cross-reference
- [ ] Email subscriber → merge profile
- [ ] Phone caller → link record
- [ ] Physical store → QR code scan
- [ ] Mobile app → unified profile

---

### 5. SupportOS — AI Support Agent

**What it does:** Handles all customer support without human agents. When humans are needed, gives them full context.

**Capabilities:**
- [ ] Order status lookup
- [ ] Order modification
- [ ] Order cancellation
- [ ] Refund requests
- [ ] Return processing
- [ ] Exchange requests
- [ ] Subscription management
  - [ ] Plan upgrades
  - [ ] Plan downgrades
  - [ ] Renewals
  - [ ] Cancellations
- [ ] Warranty checks
- [ ] Ticket creation
- [ ] Escalation management
- [ ] Knowledge base search
- [ ] Document retrieval
- [ ] Troubleshooting guides
- [ ] Voice support

**Human handoff features:**
- [ ] Auto-escalation rules
- [ ] Priority routing
- [ ] Customer context pre-fill
- [ ] Suggested responses
- [ ] Conversation history transfer
- [ ] Post-handoff AI learning

---

### 6. CommerceOS — Product & Inventory Intelligence

**What it does:** Manages the product catalog, pricing, and inventory.

**Features:**
- [ ] Product catalog sync (Shopify, WooCommerce, custom API)
- [ ] Real-time inventory tracking
- [ ] Demand forecasting
- [ ] Low stock alerts
- [ ] Slow-moving product detection
- [ ] Bundling recommendations
- [ ] Dynamic pricing
  - [ ] Demand-based pricing
  - [ ] Inventory-based pricing
  - [ ] Time-based pricing
  - [ ] Segment-based pricing
- [ ] Discount optimization
  - [ ] Minimum effective discount calculation
  - [ ] Profit impact analysis
- [ ] Subscription management
- [ ] Loyalty points engine
- [ ] Gift card management

---

### 7. AnalyticsOS — Revenue Intelligence & Heatmaps

**What it does:** Tracks everything, explains everything, recommends everything.

**Website intelligence:**
- [ ] Visitor tracking
  - [ ] Mouse movement
  - [ ] Click heatmaps
  - [ ] Scroll depth
  - [ ] Rage clicks
  - [ ] Dead clicks
  - [ ] Session recordings
  - [ ] Time spent per page
  - [ ] Hover behavior
  - [ ] Exit intent
  - [ ] Form abandonment
- [ ] Heatmap generation
- [ ] Session replay
- [ ] Funnel visualization
- [ ] Drop-off analysis
- [ ] Page performance metrics

**Business metrics:**
- [ ] Revenue dashboard (real-time)
- [ ] Conversion rates (visit → cart → checkout → purchase)
- [ ] ROAS tracking
- [ ] Churn rate
- [ ] LTV calculation
- [ ] Retention rate
- [ ] Average order value
- [ ] Cart abandonment rate
- [ ] Checkout abandonment rate

**AI explanations:**
- [ ] Natural language insights ("Revenue dropped because...")
- [ ] Anomaly detection
- [ ] Trend analysis
- [ ] Seasonality detection
- [ ] Comparative analysis (vs last week/month/year)

**AI recommendations:**
- [ ] Actionable recommendations with revenue impact
- [ ] "Introduce UPI express checkout → +11% revenue"
- [ ] "Mobile checkout has 22% higher abandonment → fix form fields"
- [ ] Priority ranking of issues

---

### 8. AdOS — Smart Pixel & Attribution Manager

**What it does:** The intelligence layer above all ad platforms. Meta Pixel tells what happened. HOJAI tells why and what to do.

**Pixel management:**
- [ ] Meta Events (PageView, ViewContent, Search, AddToCart, InitiateCheckout, Purchase, etc.)
- [ ] Google Ads Conversions
- [ ] Google Enhanced Conversions
- [ ] TikTok Events
- [ ] LinkedIn Insight Tag
- [ ] Twitter Pixel
- [ ] Snapchat Pixel

**Conversion API (CAPI):**
- [ ] Meta CAPI (server-side)
- [ ] Google Enhanced Conversions API
- [ ] TikTok Events API
- [ ] LinkedIn Conversions API
- [ ] Offline conversion sync

**Attribution engine:**
- [ ] Multi-touch attribution model
- [ ] First-touch attribution
- [ ] Last-touch attribution
- [ ] Linear attribution
- [ ] Time-decay attribution
- [ ] Custom attribution rules
- [ ] Cross-device tracking
- [ ] Cross-channel journey mapping

**Audience builder:**
- [ ] Hot prospects audience
- [ ] Cart abandoner audience
- [ ] Churn risk audience
- [ ] VIP customer audience
- [ ] Lookalike audiences
- [ ] Custom segments
- [ ] Auto-sync to ad platforms

**Campaign intelligence:**
- [ ] ROAS prediction
- [ ] Budget optimization recommendations
- [ ] Audience performance analysis
- [ ] Creative performance analysis
- [ ] Ad creative suggestions
- [ ] Bid optimization
- [ ] Competitor ad monitoring

**Future:**
- [ ] Autonomous media buying

---

### 9. VoiceOS — Voice Business Manager

**What it does:** The same AI works as a voice assistant on website, phone, WhatsApp.

**Website voice:**
- [ ] "Show me shoes under ₹3000"
- [ ] "Book a table for 4"
- [ ] "Track my order"

**Phone receptionist:**
- [ ] IVR system
- [ ] Natural language routing
- [ ] Appointment booking
- [ ] Order status
- [ ] FAQ answering
- [ ] Call transfer
- [ ] Voicemail transcription

**WhatsApp voice:**
- [ ] Voice message transcription
- [ ] Voice command execution
- [ ] TTS for responses

---

### 10. ExperimentOS — AI-Powered Experimentation

**What it does:** Runs A/B tests and CRO experiments automatically.

**Features:**
- [ ] A/B testing
- [ ] Multivariate testing
- [ ] Landing page experiments
- [ ] CTA text optimization
- [ ] CTA position optimization
- [ ] Pricing layout experiments
- [ ] Checkout flow optimization
- [ ] Headline testing
- [ ] Image testing
- [ ] AI-generated variants
- [ ] Statistical significance detection
- [ ] Winner declaration
- [ ] Auto-rollout of winners

---

### 11. ContentOS — AI Content Engine

**What it does:** Generates all marketing and website content automatically.

**Features:**
- [ ] Product descriptions
- [ ] Email sequences
- [ ] WhatsApp message templates
- [ ] Landing pages
- [ ] Blog articles
- [ ] FAQs
- [ ] Knowledge base articles
- [ ] Social media posts
- [ ] Ad copy
- [ ] Meta descriptions
- [ ] Video scripts
- [ ] Newsletter content

---

### 12. SEOOS — AI Website Manager

**What it does:** Monitors and optimizes website SEO automatically.

**Features:**
- [ ] Broken link detection
- [ ] 404 error monitoring
- [ ] Missing meta descriptions
- [ ] Meta title optimization
- [ ] Heading structure analysis
- [ ] Image alt text
- [ ] Schema markup validation
- [ ] Page speed monitoring
- [ ] Mobile friendliness
- [ ] Keyword opportunity detection
- [ ] Competitor keyword analysis
- [ ] Content gap analysis
- [ ] Internal linking suggestions
- [ ] Technical SEO audits

---

### 13. Nexus Connect — Gateway to Global Agent Economy

**What it does:** Allows every HOJAI business to sell through the global agent network.

**Layers:**
```
Nexus Connect
├── Discovery Engine
│   └── "Who can discover me?"
├── Trust & Reputation
│   └── Agent trust scores, fulfillment history
├── Routing
│   └── Route customer agents to merchant agents
├── Settlement
│   └── Payment and commission handling
├── Federation
│   └── Product/service catalog sync
├── Identity
│   └── Global business identity
├── Reputation
│   └── Cross-platform reputation
└── Agent Marketplace
    └── List AI employees for hire
```

**Distribution modes:**
- [ ] Local Only (website only)
- [ ] DO Network (website + DO App)
- [ ] Full Nexus (website + DO + partner agents + global procurement)

**Agent-to-Agent commerce:**
- [ ] Customer Agent → Nexus → Merchant Agent → Negotiation → Payment → Fulfillment
- [ ] Procurement Agent → Nexus → Supplier Agent → Quote → Order → Delivery
- [ ] Travel Agent → Nexus → Hotel Agents → Availability → Booking → Confirmation

---

## 100-Event Taxonomy

Everything starts with tracking. This is the foundation.

```
┌─────────────────────────────────────────────────────────────┐
│                    WEBSITE EVENTS                           │
├─────────────────────────────────────────────────────────────┤
│ page_view          │ product_view       │ search_query     │
│ add_to_cart        │ remove_from_cart   │ wishlist_add     │
│ wishlist_remove    │ checkout_start     │ checkout_complete │
│ payment_info_add   │ payment_complete   │ subscription_start│
│ subscription_end   │ refund_initiated   │ refund_complete   │
│ cart_update        │ cart_abandon      │ checkout_abandon  │
│ session_start      │ session_end       │ return_initiated  │
│ return_complete    │ exchange_initiated │ exchange_complete│
├─────────────────────────────────────────────────────────────┤
│                   USER EVENTS                               │
├─────────────────────────────────────────────────────────────┤
│ sign_up           │ login             │ logout            │
│ profile_update    │ email_subscribe   │ email_unsubscribe  │
│ phone_verify      │ address_add       │ address_update     │
│ password_change   │ 2fa_enable        │ 2fa_disable       │
│ referral_complete │ invite_sent       │ account_delete    │
├─────────────────────────────────────────────────────────────┤
│                   ENGAGEMENT EVENTS                         │
├─────────────────────────────────────────────────────────────┤
│ widget_open       │ widget_close      │ message_sent       │
│ message_received  │ voice_input       │ search_query       │
│ filter_apply      │ sort_apply        │ zoom_image        │
│ video_play        │ video_pause       │ video_complete    │
│ download_click    │ share_click       │ social_share      │
│ pdf_view          │ form_start        │ form_abandon       │
│ form_submit       │ quiz_start        │ quiz_complete      │
│ poll_vote         │ review_submit     │ rating_submit     │
├─────────────────────────────────────────────────────────────┤
│                   INTENT SIGNALS                            │
├─────────────────────────────────────────────────────────────┤
│ pricing_visit     │ comparison_view   │ demo_request      │
│ trial_start       │ consultation_book │ contact_click     │
│ chat_start        │ call_click        │ whatsapp_click    │
│ cta_hover         │ cta_click         │ exit_intent       │
│ scroll_75         │ scroll_100       │ time_on_page_gt5  │
│ repeat_visit      │ mobile_view       │ desktop_view      │
│ return_visitor    │ new_visitor       │ referral_visit    │
│ organic_visit     │ paid_visit        │ social_visit      │
├─────────────────────────────────────────────────────────────┤
│                   COMMERCE EVENTS                           │
├─────────────────────────────────────────────────────────────┤
│ out_of_stock      │ back_in_stock     │ price_change      │
│ discount_apply    │ coupon_apply      │ coupon_remove     │
│ loyalty_redeem    │ loyalty_earn      │ gift_card_use     │
│ bundle_purchase   │ upsell_view       │ cross_sell_view   │
│ upsell_accept     │ cross_sell_accept │ quantity_update   │
├─────────────────────────────────────────────────────────────┤
│                   SUPPORT EVENTS                            │
├─────────────────────────────────────────────────────────────┤
│ ticket_create     │ ticket_resolve    │ ticket_escalate   │
│ ticket_close      │ chat_transfer     │ callback_request  │
│ warranty_check    │ return_initiate   │ refund_request    │
│ exchange_request  │ complaint_log    │ feedback_submit   │
├─────────────────────────────────────────────────────────────┤
│                   MARKETING EVENTS                          │
├─────────────────────────────────────────────────────────────┤
│ email_open        │ email_click      │ email_bounce      │
│ email_unsubscribe │ sms_delivered    │ sms_failed        │
│ sms_click         │ push_sent        │ push_open         │
│ push_click        │ campaign_sent    │ campaign_open     │
│ campaign_click    │ automation_trigger│ segment_enter     │
│ segment_exit      │ experiment_view   │ experiment_conver │
├─────────────────────────────────────────────────────────────┤
│                   PERFORMANCE EVENTS                       │
├─────────────────────────────────────────────────────────────┤
│ page_slow         │ page_error       │ api_error         │
│ payment_error     │ checkout_error   │ 404_error         │
│ js_error          │ rage_click       │ dead_click        │
│ form_error        │ session_timeout  │ api_timeout       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Get a working AI salesperson widget that businesses can install in 5 minutes.

**Deliverables:**

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Fix `widget-backend` `package.json` (add missing deps) | ? | PENDING |
| 2 | Add MongoDB persistence to widget-backend | ? | PENDING |
| 3 | Implement rich content rendering in widget-core | ? | PENDING |
| 4 | Fix WhatsApp webhook HMAC verification | ? | PENDING |
| 5 | Build 10-core event tracking SDK | ? | PENDING |
| 6 | Build basic intent classifier (existing: keep + improve) | ? | PENDING |
| 7 | Wire SUTAR agents (replace localhost stubs) | ? | PENDING |
| 8 | One-click Shopify install (OAuth app, not Liquid snippet) | ? | PENDING |
| 9 | One-click WordPress install (plugin with proper cleanup) | ? | PENDING |
| 10 | JS embed snippet — `cdn.hojai.ai/widget.js` | ? | PENDING |
| 11 | Basic Customer Twin (identity + behavior) | ? | PENDING |
| 12 | Basic abandoned cart trigger (WhatsApp + email) | ? | PENDING |
| 13 | Shopify store integration | ? | PENDING |
| 14 | WooCommerce integration | ? | PENDING |
| 15 | WordPress/WooCommerce integration | ? | PENDING |

**Success metrics:**
- Installation time < 5 minutes
- Widget loads on page < 2 seconds
- Basic chat → response < 3 seconds
- Cart abandonment detection working

---

### Phase 2: Intelligence Layer (Weeks 5-8)

**Goal:** Turn the widget into an intelligent salesperson and marketing engine.

**Deliverables:**

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Lead scoring engine (0-100) | ? | PENDING |
| 2 | Intent signal tracking (10 signals) | ? | PENDING |
| 3 | Purchase intent detection levels | ? | PENDING |
| 4 | Personalized greeting ("Hi John") | ? | PENDING |
| 5 | Dynamic product recommendations | ? | PENDING |
| 6 | Upsell/cross-sell engine | ? | PENDING |
| 7 | Abandoned cart multi-channel recovery | ? | PENDING |
| 8 | Churn prediction model | ? | PENDING |
| 9 | Customer Twin (full profile) | ? | PENDING |
| 10 | Heatmap + session recording | ? | PENDING |
| 11 | Basic revenue dashboard | ? | PENDING |
| 12 | AI recommendation engine ("fix mobile checkout") | ? | PENDING |
| 13 | Basic segmentation engine | ? | PENDING |
| 14 | Email automation (Klaviyo-style) | ? | PENDING |
| 15 | WhatsApp automation (abandoned cart, welcome) | ? | PENDING |

**Success metrics:**
- Lead scoring accuracy > 80%
- Cart recovery rate > 15%
- Revenue per visitor increases > 10%

---

### Phase 3: Expansion (Weeks 9-12)

**Goal:** Add all channels, integrations, and advanced features.

**Deliverables:**

| # | Task | Status |
|---|---|---|
| 1 | Voice widget (STT + TTS) | PENDING |
| 2 | Phone receptionist (IVR) | PENDING |
| 3 | Meta Pixel manager + CAPI | PENDING |
| 4 | Google Ads + CAPI integration | PENDING |
| 5 | TikTok + LinkedIn integrations | PENDING |
| 6 | Multi-touch attribution engine | PENDING |
| 7 | Audience builder + sync | PENDING |
| 8 | CRM connectors (Salesforce, HubSpot, Zoho) | PENDING |
| 9 | Knowledge base training (PDF, video upload) | PENDING |
| 10 | A/B testing engine | PENDING |
| 11 | SEO monitoring | PENDING |
| 12 | Content generation (emails, product descriptions) | PENDING |
| 13 | Vue + Angular + Svelte SDKs | PENDING |
| 14 | React Native + Flutter SDKs | PENDING |
| 15 | Slack + Teams integrations for owners | PENDING |

**Success metrics:**
- Multi-channel message delivery > 90%
- Attribution accuracy > 85%
- A/B test statistical significance detection working

---

### Phase 4: Nexus Connect (Weeks 13-16)

**Goal:** Connect SiteOS to the global agent economy.

**Deliverables:**

| # | Task | Status |
|---|---|---|
| 1 | Product catalog federation to Nexus | PENDING |
| 2 | Service listing for agent marketplace | PENDING |
| 3 | Agent-to-agent negotiation protocol | PENDING |
| 4 | DO App integration (sell through DO) | PENDING |
| 5 | Cross-agent order routing | PENDING |
| 6 | Agent reputation layer | PENDING |
| 7 | Payment settlement for agent transactions | PENDING |
| 8 | Procurement agent onboarding | PENDING |
| 9 | B2B agent discovery | PENDING |
| 10 | Contract engine for agent deals | PENDING |

**Success metrics:**
- Agent orders processed > 100/day
- Average agent transaction value > ₹5,000

---

### Phase 5: Autonomy (Weeks 17-20)

**Goal:** Move from recommendations to autonomous execution.

**Deliverables:**

| # | Task | Status |
|---|---|---|
| 1 | AI business advisor (natural language insights) | PENDING |
| 2 | Campaign auto-creation | PENDING |
| 3 | Coupon auto-optimization | PENDING |
| 4 | Budget auto-allocation (ads) | PENDING |
| 5 | Dynamic pricing execution | PENDING |
| 6 | Loyalty program auto-management | PENDING |
| 7 | Review response auto-generation | PENDING |
| 8 | Inventory auto-reorder suggestions | PENDING |
| 9 | Competitor monitoring + alerts | PENDING |
| 10 | Full command center ("How many carts abandoned today?") | PENDING |

**Success metrics:**
- AI-initiated actions > 50% of total actions
- Autonomous campaign success rate > 70%

---

## Pricing Tiers

| Tier | Price | Features |
|---|---|---|
| **Free** | $0/mo | 100 conversations, basic chat, 1 channel, basic analytics |
| **Starter** | $49/mo | 1,000 conversations, 3 channels, email automation, basic support |
| **Growth** | $199/mo | 10,000 conversations, all channels, WhatsApp + SMS, marketing automation, abandoned cart recovery, basic CRM |
| **Business** | $499/mo | Unlimited conversations, voice, Customer Twin, heatmaps, A/B testing, SEO monitoring, 5 team members |
| **Enterprise** | $1,499/mo | SUTAR workforce, Nexus Connect, all integrations, unlimited team, SLA, dedicated support |
| **Platform** | Custom | White-label, API access, custom connectors, on-premise deployment |

**Additional revenue:**
- AI employee subscriptions (per agent)
- Voice minutes
- Transaction fees (Nexus)
- Premium connectors (Salesforce, SAP)
- Training services

---

## Competitive Positioning

| Competitor | What they do | HOJAI SiteOS advantage |
|---|---|---|
| Intercom | Support chat | Full AI workforce, not just chat |
| Drift | Sales chat | Voice + memory + autonomous actions |
| HubSpot | CRM + marketing | Unified AI that actually does work |
| Klaviyo | Email/SMS | Website intelligence + multi-channel |
| Hotjar | Heatmaps | Autonomous optimization, not just data |
| Salesforce AgentForce | AI agents | Installs in 5 minutes, works on any website |
| Shopify Sidekick | E-commerce AI | Works everywhere, not just Shopify |

**Position:** The only AI platform that:
1. Installs in 5 minutes on ANY website
2. Knows everything about the customer (Customer Twin)
3. Does actual work (not just generates text)
4. Connects to the global agent economy (Nexus)
5. Tells owners what's broken and what to do about it

---

## 3 Immediate Actions

### 1. Define the 100-event taxonomy
Every feature builds on this. Get it right. Start tracking.

### 2. Fix the current widget (P0 issues)
The existing widget has production-blocking bugs:
- Missing npm dependencies in `widget-backend`
- No persistence (in-memory Map)
- Rich content not rendered
- WhatsApp webhook has no HMAC verification
- Shopify API key leaked client-side

Fix these FIRST. You can't demo a broken product.

### 3. Build the installation experience
The install must be < 5 minutes. If it's harder than adding Google Analytics, businesses won't adopt it.

Start with:
- Shopify OAuth app (real install, not Liquid snippet)
- WordPress plugin (with proper activation/deactivation)
- JS embed (`<script src="cdn.hojai.ai/widget.js">`)

Everything else comes after.

---

## What's Already Built

From the audit, here's what exists:

| Component | Path | Status |
|---|---|---|
| Widget core SDK | `companies/HOJAI-AI/sdk/hojai-widget-core/` | ~65% — basic chat works, rich content MISSING |
| React SDK | `companies/HOJAI-AI/sdk/hojai-widget-react/` | ~80% — thin wrapper around core |
| Widget backend | `companies/HOJAI-AI/products/widget-backend/` | ~40% — stubs, no persistence, no SUTAR wiring |
| WordPress plugin | `companies/HOJAI-AI/products/widget-install/wordpress/` | ~60% — works but needs security fixes |
| Shopify snippet | `companies/HOJAI-AI/products/widget-install/shopify/` | ~30% — Liquid only, NOT a real OAuth app |
| Intent engine | `widget-backend/src/intent-engine.js` | ~50% — 10 intents, keyword-based |
| SUTAR router | `widget-backend/src/sutar-router.js` | ~30% — localhost stubs, graceful degradation |
| WhatsApp channel | `widget-backend/src/channels/whatsapp.js` | ~50% — scaffolded, HMAC verification MISSING |
| i18n (19 languages) | `hojai-widget-core/src/i18n.ts` | ~90% — comprehensive |

**Total estimated completion: ~35% of the full vision.**

---

## Resources Needed

| Phase | Engineers | Designer | Time |
|---|---|---|---|
| Phase 1 | 3 | 1 | 4 weeks |
| Phase 2 | 4 | 1 | 4 weeks |
| Phase 3 | 4 | 1 | 4 weeks |
| Phase 4 | 3 | 0 | 4 weeks |
| Phase 5 | 3 | 0 | 4 weeks |
| **Total** | **17 engineers** | **3 designers** | **20 weeks** |

---

## Success Metrics (Year 1)

| Metric | Target |
|---|---|
| Websites installed | 10,000 |
| Monthly active websites | 5,000 |
| Cart recovery rate | > 15% |
| Lead capture improvement | > 25% |
| Customer support deflection | > 60% |
| Revenue growth per customer | > 10% |
| NPS score | > 50 |
| Gross margin | > 70% |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Connector problem** — Without deep integrations, it's just a chatbot | Build connectors for top 10 platforms first (Shopify, WooCommerce, Salesforce, HubSpot, Zoho, Stripe, Razorpay, WhatsApp, Google, Meta) |
| **Trust problem** — Businesses won't give AI full autonomy | Build "Suggest → Approve → Auto" progression (3 autonomy levels) |
| **Vertical specialization** — Generic AI is weaker than industry-specific | Build 5 vertical templates first (Retail, Restaurant, Hotel, Healthcare, Real Estate) |
| **Event infrastructure** — Real-time tracking is hard | Use existing HOJAI event infrastructure + build on top |
| **Bundle size** — 37KB is too big for a "5KB" widget | Code-split: core chat (5KB) + analytics (lazy) + voice (dynamic) |

---

*This document is the canonical master plan for HOJAI SiteOS. It supersedes the previous `hojai-widget-spec.md` and incorporates all vision documents shared in June 2026.*

*Last updated: 2026-06-27*
