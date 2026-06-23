# HOJAI Widget — Billion-Dollar Distribution Channel

> **Date:** 2026-06-22
>
> **Vision:** HOJAI Widget is a 5KB JavaScript snippet that can be embedded on any website. It becomes the front door to the company's AI workforce (SUTAR), enabling search, booking, ordering, payment, support, and negotiation through natural language.

---

## 0. Executive Summary

**HOJAI Widget is the distribution channel that makes HOJAI a household name for every business.**

Every business needs a website. Every website can have this widget. With 10M+ websites using HOJAI Widget, HOJAI reaches every business on the planet.

**The widget:**
- Replaces: live chat, contact form, search, booking widget, checkout widget
- Becomes: the front door to SUTAR (AI employees)
- Connects to: DiscoveryOS, ReputationOS, OpportunityOS
- Monetizes: BAM (AI Employees), HOJAI Cloud, REZ

**Time to build:** 8-12 weeks for MVP
**Year 1 target:** 10,000 websites
**Year 3 target:** 1M websites
**Year 5 target:** 10M+ websites (every business on Earth)

---

## 1. The Problem (today's website)

Every website has:
- Live chat widget
- Contact us form
- FAQ
- Support
- Search
- Forms
- WhatsApp
- Booking widget
- Product search

**All disconnected. All requiring humans.**

---

## 2. The Solution (HOJAI Widget)

One AI. Connected to SUTAR. Handles everything.

```
Customer
    ↓
HOJAI AI Widget (5KB)
    ↓
Intent Engine
    ↓
FlowOS (orchestrates)
    ↓
SUTAR (AI employees)
    ↓
Department Agents
    ↓
Company Systems
├── CRM
├── ERP
├── POS
├── Inventory
├── Orders
├── Payments
├── Bookings
├── Nexha
└── HOJAI Gateway (multi-model)
```

**The widget never answers alone. It delegates to AI agents.**

---

## 3. Widget Capabilities (15+)

| Capability | What it does | Example |
|---|---|---|
| **AI Search** | Natural language search | "Show black hoodies under ₹2500" |
| **AI Booking** | Books appointments, tables, rooms | "Book table for 2 tomorrow at 7pm" |
| **AI Order** | Places orders | "Order 2 margherita pizzas" |
| **AI Payment** | Processes payments | "Pay ₹500" |
| **AI Support** | Handles support tickets | "My order hasn't arrived" |
| **AI Negotiation** | Negotiates prices (where allowed) | "Can you do 10% off?" |
| **AI Recommendation** | Personalized recommendations | "Suggest a gift under ₹2000" |
| **AI Tracking** | Tracks orders | "Where's my order?" |
| **AI Return** | Handles returns | "I want to return this" |
| **AI Lead** | Captures leads | "Send me a quote" |
| **AI Quote** | Generates quotes | "Quote for 500 units" |
| **AI Subscription** | Manages subscriptions | "Upgrade my plan" |
| **AI Upsell** | Suggests upsells | "Add gift wrapping?" |
| **AI Cross-sell** | Suggests related products | "Customers who bought X also bought Y" |
| **AI Voice** | Voice conversation | "Call me back" |
| **AI Video** | Video call | "Talk to a human" |

---

## 4. Channels (not just website)

Same AI everywhere:

| Channel | Status |
|---|---|
| **Website** | Primary |
| **Mobile App** | Via SDK |
| **WhatsApp** | Via Business API |
| **Instagram** | Via DM API |
| **Facebook Messenger** | Via Meta API |
| **Telegram** | Via Bot API |
| **Voice Call** | Via Twilio + Genie |
| **Phone** | Via Genie Voice |
| **Email** | Via SMTP |
| **QR Code** | At physical locations |
| **POS** | At checkout |
| **Kiosk** | At airports, malls, hotels |
| **Smart TV** | At hotels, hospitals |
| **Car** | Via Apple CarPlay / Android Auto |
| **AR Glasses** | Future |

**One memory. One AI. Everywhere.**

---

## 5. Technical Architecture

### Widget Core (5KB minified)

```typescript
// @hojai/widget
import { HojaiWidget } from '@hojai/widget';

const widget = new HojaiWidget({
  apiKey: 'pk_live_...',
  containerId: '#hojai-chat',
  config: {
    name: 'Maya Collective Assistant',
    avatar: '...',
    color: '#3B82F6',
    position: 'bottom-right',
    language: 'en',
    voice: { enabled: true },
    channels: { web: true, whatsapp: true }
  }
});

widget.render();
```

### Widget → SUTAR Architecture

```
Widget (browser)
    ↓ HTTPS + JWT
HOJAI Gateway (load balancer)
    ↓
Intent Engine (classify user's message)
    ↓
FlowOS (orchestrates)
    ↓
SUTAR (AI employees)
    ├── Sales Agent
    ├── Support Agent
    ├── Booking Agent
    ├── Commerce Agent
    └── ...
    ↓
Company Systems (CRM, ERP, POS, etc.)
    ↓
Response back to Widget
```

### Backend Flow

```typescript
class HojaiWidgetBackend {
  async handleMessage(message: string, context: WidgetContext) {
    // 1. Classify intent
    const intent = await this.intentEngine.classify(message);
    
    // 2. Route to appropriate agent
    const agent = this.routeToAgent(intent);
    
    // 3. Execute workflow
    const result = await this.flowEngine.execute(agent, message, context);
    
    // 4. Update memory (TwinOS)
    await this.twin.update(context.userTwin, { lastInteraction: result });
    
    // 5. Track analytics
    await this.analytics.track({
      message, intent, agent, result, context
    });
    
    // 6. Charge BAM if applicable
    if (result.cost) {
      await this.bam.charge(context.company, result.cost);
    }
    
    return result;
  }
}
```

---

## 6. SDK + Integrations

### Official SDKs

| SDK | Language | Size |
|---|---|---|
| `@hojai/widget-core` | JavaScript (5KB) | 5KB minified |
| `@hojai/widget-react` | React | 8KB minified |
| `@hojai/widget-vue` | Vue.js | 8KB minified |
| `@hojai/widget-angular` | Angular | 10KB minified |
| `@hojai/widget-svelte` | Svelte | 7KB minified |
| `@hojai/widget-wordpress` | WordPress plugin | n/a |
| `@hojai/widget-shopify` | Shopify app | n/a |
| `@hojai/widget-webflow` | Webflow integration | n/a |
| `@hojai/widget-wordpress-plugin` | WordPress | n/a |
| `@hojai/widget-react-native` | React Native | 15KB minified |
| `@hojai/widget-flutter` | Flutter | 20KB minified |

### Installation Methods

**Method 1: HTML Snippet (5 seconds)**
```html
<script src="https://cdn.hojai.ai/widget.js" data-key="pk_live_abc123"></script>
```

**Method 2: NPM (1 minute)**
```bash
npm install @hojai/widget-react
```

**Method 3: WordPress (3 clicks)**
1. Install plugin
2. Enter API key
3. Done

**Method 4: Shopify (1 click)**
- Install from Shopify App Store
- Auto-connects to Shopify
- Done

**Method 5: Webflow (1 click)**
- Add from Webflow marketplace
- Auto-connects
- Done

---

## 7. Pricing Tiers

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0/mo | 100 conversations/mo, basic features |
| **Starter** | $49/mo | 1,000 conversations, all features, email support |
| **Professional** | $199/mo | 10,000 conversations, voice, memory, CRM |
| **Business** | $499/mo | 50,000 conversations, SUTAR department agents, Nexha |
| **Enterprise** | $1,499+/mo | Unlimited, SUTAR full workforce, ACP, on-premise |

**Plus:** REZ-incentivized attention (customers earn REZ for engaging with widget)

---

## 8. Business Model (3 revenue streams)

### Stream 1: SaaS Subscription ($49-$1499/mo per website)

| Year | Websites | ARPU | ARR |
|---|---|---|---|
| Y1 | 10,000 | $100 | $12M |
| Y3 | 1M | $150 | $1.8B |
| Y5 | 10M | $200 | $24B |

### Stream 2: AI Employee Add-ons (via BAM)

- AI Sales Manager: +$500/mo
- AI Support Agent: +$200/mo
- AI Booking Agent: +$100/mo
- Full SUTAR workforce: +$2,000/mo

**Adoption rate: 20% of widget customers add AI employees**
**Average: $1,000/mo in add-ons per paying customer**

| Year | Add-on Revenue |
|---|---|
| Y1 | $24M (10K customers × 20% × $1K) |
| Y3 | $3.6B |
| Y5 | $48B |

### Stream 3: Transaction Fees (via REZ + Nexha)

- 0.5% on transactions made via widget
- 10% of REZ cashback flow

| Year | GMV via Widget | Transaction Revenue |
|---|---|---|
| Y1 | $1B | $5M |
| Y3 | $100B | $500M |
| Y5 | $1T | $5B |

### Total Revenue Projection

| Year | Widget Revenue |
|---|---|
| Y1 | $41M |
| Y3 | $5.9B |
| Y5 | $77B |

---

## 9. Distribution Strategy (the viral part)

### Phase 1: Seed (Month 1-3)

- Install on 100 pilot websites (existing RABTUL customers)
- Get case studies
- Test in 10 industries (restaurant, hotel, retail, etc.)

### Phase 2: WordPress + Shopify (Month 4-6)

- Publish WordPress plugin
- Publish Shopify app
- Auto-install via CMS marketplaces
- Target: 10,000 websites in 6 months

### Phase 3: Viral (Month 7-12)

- "Add HOJAI Widget to your site in 30 seconds"
- Free tier with upgrade path
- Referral program (websites refer other websites)
- SEO: "best AI widget for websites"
- Content: blog posts, YouTube tutorials, podcasts

### Phase 4: Enterprise (Year 2)

- SAP, Oracle, Salesforce integrations
- On-premise deployment
- Custom widgets for large enterprises
- White-label option

### Phase 5: Global (Year 3+)

- 50+ languages
- Local compliance (GDPR, CCPA, India DPDP)
- Local payment methods
- Local discovery (BuzzLocal integration)

---

## 10. Why HOJAI Widget is a Billion-Dollar Product

### 1. Massive TAM

- 1.7B websites worldwide
- 500M+ active business websites
- Even 1% adoption = 5M websites

### 2. Network Effects

- More widgets = more AI usage = smarter agents
- More AI employees available = more value per widget
- More businesses = more REZ transactions
- More conversations = better intent classification

### 3. Lock-in

- Once installed, hard to remove (customer-facing)
- Memory + history accumulated
- AI trained on company-specific data
- Switching cost increases over time

### 4. Distribution for Everything Else

The widget is the **distribution channel** for:
- HOJAI Studio (companies can try before buying)
- HOJAI Cloud (hosting for the widget backend)
- BAM (AI employees installed via widget)
- Nexha (federation with other businesses)
- REZ (cashback + transactions via widget)

**The widget is the front door. Everything else is behind it.**

---

## 11. Widget Features (detailed)

### 11.1 Core Features

| Feature | Description |
|---|---|
| **5KB Core** | Minified JS, gzipped, no dependencies |
| **Lazy Load** | Loads only when needed |
| **WebSocket** | Real-time bidirectional communication |
| **Offline Fallback** | Local cache for offline scenarios |
| **PWA Support** | Installable on mobile |
| **A11y** | WCAG 2.1 AA compliant |
| **i18n** | 50+ languages |
| **Themes** | Light, dark, custom |
| **Position** | Bottom-right, bottom-left, custom |
| **Animation** | Configurable entry animation |

### 11.2 AI Features

| Feature | Description |
|---|---|
| **Natural Language** | Multi-language support |
| **Voice Input** | Speech-to-text |
| **Voice Output** | Text-to-speech |
| **Image Input** | OCR + image understanding |
| **File Upload** | Document analysis |
| **Voice Call** | Escalation to human |
| **Video Call** | Escalation to human |
| **Multi-turn Context** | Remembers conversation |
| **Memory** | Per-user + per-company |
| **Personalization** | Learns from past interactions |

### 11.3 Business Features

| Feature | Description |
|---|---|
| **CRM Integration** | HubSpot, Salesforce, Zoho |
| **E-commerce** | Shopify, WooCommerce, Magento |
| **Booking** | Calendly, Acuity |
| **Payment** | Stripe, PayPal, Razorpay |
| **Support** | Zendesk, Intercom, Freshdesk |
| **Analytics** | Google Analytics, Mixpanel |
| **CRM Sync** | Two-way sync with company CRM |
| **Order Tracking** | Real-time order updates |
| **Inventory Check** | Live inventory from POS |
| **Shipping** | Track packages |

---

## 12. Business Dashboard (for widget owners)

Owner sees:
- Top 100 questions (most common)
- Revenue generated via widget
- Conversion rate
- Customer satisfaction
- AI performance (accuracy, latency)
- Missed opportunities
- Upsell suggestions
- Lead capture
- Booking rate
- Order completion rate

---

## 13. White Label

Companies can customize:
- Name
- Logo
- Color scheme
- Voice (TTS)
- Avatar
- Personality
- Language
- Tone (formal, casual, friendly)

**Their AI. Powered by HOJAI.**

---

## 14. Competitive Analysis

| Competitor | What they do | HOJAI Widget Advantage |
|---|---|---|
| **Intercom** | Live chat | Full AI employees, not just chat |
| **Drift** | Conversational marketing | Voice + memory + transactions |
| **Zendesk** | Support | Connects to SUTAR (full AI workforce) |
| **Tidio** | Live chat | Multi-channel (web, WhatsApp, voice) |
| **Crisp** | Live chat | DiscoveryOS + Nexha + REZ |
| **HubSpot Chat** | Live chat | AI Employees, not just chat |
| **Drift / Adabra** | Conversational AI | Full autonomous commerce |
| **WhatsApp Business** | WhatsApp only | Multi-channel + AI employees |

**HOJAI Widget is not "another chat widget." It's the AI front office.**

---

## 15. The 30-Minute Setup

```
Step 1: Sign up at hojai.ai/widget (1 minute)
Step 2: Add API key to website (30 seconds)
    <script src="https://cdn.hojai.ai/widget.js" data-key="pk_live_..."></script>
Step 3: Test in browser (1 minute)
Step 4: Customize (colors, name, position) (5 minutes)
Step 5: Go live (1 click)
```

**Total: 8 minutes to production.**

Compare to:
- Intercom: 30+ minutes
- Drift: 1+ hour
- Custom chatbot: weeks

---

## 16. Build Plan (8-12 weeks for MVP)

### Week 1-2: Core Widget
- 5KB JS core
- HTTPS + JWT auth
- Basic chat UI
- Backend (Intent Engine + FlowOS integration)

### Week 3-4: SUTAR Integration
- Connect to SUTAR
- Sales Agent + Support Agent + Booking Agent
- Multi-language support
- Voice input/output

### Week 5-6: Channels
- WhatsApp integration
- Voice call escalation
- Email fallback
- Mobile SDK

### Week 7-8: Integrations
- WordPress plugin
- Shopify app
- Webflow integration
- Zapier connector

### Week 9-10: Business Features
- CRM sync
- E-commerce sync
- Booking system
- Payment processing

### Week 11-12: Launch
- Business dashboard
- Analytics
- White label
- Public launch

---

## 17. Pricing Strategy (the viral part)

### Free Tier (the hook)

- 100 conversations/month
- Basic features
- HOJAI branding (subtle)
- Upgrade prompts

### Why Free?

- **Viral distribution:** 100K free widgets = 100K potential paying customers
- **Network effects:** More widgets = better AI
- **Data:** Learn from every conversation
- **Lock-in:** Once installed, hard to remove

### Conversion Strategy

- **Trial:** 14 days Professional free
- **Usage alerts:** "You've used 95 of 100 conversations"
- **Feature gates:** "Upgrade to add voice calls"
- **Annual discount:** 20% off if paid yearly
- **Referral:** Get 1 month free per referral

---

## 18. Success Metrics (Y1)

| Metric | Target |
|---|---|
| Widgets installed | 10,000 |
| Monthly conversations | 1M |
| AI employees sold via widget | 500 |
| REZ transactions via widget | 100K |
| Revenue | $41M ARR |
| NPS | 70+ |
| Conversion rate (free → paid) | 15% |

---

## 19. The Single Sentence

> **HOJAI Widget is a 5KB JavaScript snippet that can be embedded on any website, app, or channel — turning every digital touchpoint into an AI front office powered by the company's SUTAR workforce, generating $77B+ ARR by Year 5 through subscriptions, AI employee sales, and REZ transactions.**

---

## 20. Next Steps

1. **Build the MVP** (8-12 weeks, 2-3 engineers)
2. **Install on 100 pilot websites** (existing RABTUL customers)
3. **Publish WordPress + Shopify apps** (auto-distribution)
4. **Build the first 5 SUTAR agent templates** (Sales, Support, Booking, Commerce, Assistant)
5. **Launch publicly** at HOJAI DevDay

---

*This document is the canonical reference for HOJAI Widget. It complements the architecture v2, the 5-year plan, the BAM complete spec, and the developer platform spec.*

*Last updated: 2026-06-22*
