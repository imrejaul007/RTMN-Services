import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { persona } from "../persona.js";
import type { ChatRequest, ChatResponse, ChatMessage } from "../types.js";

const router = Router();
const sessions: Map<string, ChatMessage[]> = new Map();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { messages, sessionId, context } = req.body as ChatRequest;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const session = sessionId || uuidv4();
    let history = sessions.get(session) || [];

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: messages[messages.length - 1]?.content || "",
      timestamp: Date.now()
    };
    history.push(userMessage);

    const response = await generateResponse(persona, history, context);
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content: response,
      timestamp: Date.now()
    };
    history.push(assistantMessage);

    if (history.length > 50) history = history.slice(-50);
    sessions.set(session, history);

    res.json({ message: assistantMessage, sessionId: session });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history/:sessionId", (req: Request, res: Response) => {
  res.json({ sessionId: req.params.sessionId, messages: sessions.get(req.params.sessionId) || [] });
});

router.delete("/session/:sessionId", (req: Request, res: Response) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

async function generateResponse(persona: typeof import("../persona.js").persona, history: ChatMessage[], context?: ChatRequest["context"]): Promise<string> {
  const lastMessage = history[history.length - 1]?.content.toLowerCase() || "";

  if (lastMessage.includes("gtm") || lastMessage.includes("google tag manager") || lastMessage.includes("container")) {
    return `## GTM Container Architecture

### Container Health Checklist
- [ ] <50 tags (bloated = slow)
- [ ] Workspace strategy (dev/staging/prod)
- [ ] Version control with notes
- [ ] Regular cleanup of unused tags/triggers

### Tag Types by Priority
**Always Needed**:
- GA4 pageview
- Google Ads conversion link
- Meta Pixel

**As Needed**:
- Other ad platforms
- Chat widgets
- Heatmaps

### Trigger Best Practices
- Use Built-in variables
- Custom event triggers for dataLayer pushes
- Pageview triggers = necessary only
- Event triggers = preferred

### dataLayer Standard Events
| Event | When |
|-------|------|
| page_view | Every page |
| view_item | Product pages |
| add_to_cart | Add actions |
| begin_checkout | Checkout start |
| purchase | Transaction complete |

### Consent Mode v2
- Tags should wait for consent
- Consent triggers by region
- Default: denied for all

What GTM issue would you like to troubleshoot?`;
  }

  if (lastMessage.includes("ga4") || lastMessage.includes("google analytics")) {
    return `## GA4 Implementation

### Event Taxonomy
**Automatically Collected**:
- page_view
- scroll
- outbound_click
- site_search
- video_engagement
- file_download

**Enhanced Measurement** (Enable these):
- Scroll tracking
- Outbound clicks
- Site search
- Video engagement
- File downloads

**Ecommerce Events**:
```
view_item → view_item_list → add_to_cart →
begin_checkout → add_payment_info → purchase
```

### Custom Dimensions
| Scope | Dimension |
|-------|-----------|
| Hit | Page title, location |
| Session | Campaign source |
| User | Logged-in state |

### dataLayer for Ecommerce
```javascript
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T12345',
    value: '59.97',
    currency: 'USD',
    items: [
      { item_id: 'SKU123', item_name: 'Widget', price: '29.99', quantity: 2 }
    ]
  }
});
```

### Cross-Domain Tracking
- Add to GTM: Configure your domains
- GA4: Add domain to streams
- Links: Add ?gclid to outbound links

What GA4 issue would you like to address?`;
  }

  if (lastMessage.includes("conversion") || lastMessage.includes("google ads") || lastMessage.includes("google-ads")) {
    return `## Google Ads Conversion Tracking

### Conversion Action Setup
| Type | Use For | Counting |
|------|---------|---------|
| Primary | Main purchases/signups | Every |
| Secondary | Secondary actions | One per session |

### Enhanced Conversions
**Leads (Web)**:
1. Collect user data (email, phone)
2. Hash before sending (SHA-256)
3. Send with conversion tag

**How to Hash**:
```javascript
function hash(data) {
  return sha256(data.toLowerCase().trim());
}
```

### Offline Imports
1. Generate GCLID on conversion
2. Store in CRM
3. Upload via API or CSV
4. Match rate: Target 70%+

### Conversion Value Rules
- Different products = different values
- Geographic value differences
- Time-based value (weekday vs weekend)

### Tracking Discrepancy Check
Target: <3% difference between:
- Google Ads reported
- GA4 measured
- CRM records

>5% discrepancy = investigate

What conversion tracking issue would you like to troubleshoot?`;
  }

  if (lastMessage.includes("meta") || lastMessage.includes("facebook") || lastMessage.includes("pixel") || lastMessage.includes("capi")) {
    return `## Meta Pixel & CAPI Setup

### Pixel Implementation
**Standard Events**:
- PageView (all pages)
- ViewContent (product pages)
- AddToCart (cart adds)
- InitiateCheckout (checkout start)
- Purchase (transaction)

### CAPI (Conversions API)
**Why**: iOS 14+ killed Pixel accuracy

**Required Data**:
- Event name
- Event time
- Event source URL
- Action source

**Matching**: Hash PII:
- email
- phone
- first_name + last_name
- city + state + country

### Event Deduplication
Use event_id to prevent double-counting:
```javascript
fbq('track', 'Purchase', {
  content_ids: ['123'],
  value: 59.97,
  currency: 'USD'
}, {eventID: 'unique-id-123'});
```

### Domain Verification
Required for:
- Conversions API
- Offline conversions
- Advanced matching

### Aggregated Event Measurement
iOS 14+ limits:
- 8 events per domain
- Priority by value

What Meta tracking issue would you like to address?`;
  }

  if (lastMessage.includes("discrepancy") || lastMessage.includes("mismatch") || lastMessage.includes("discrepan")) {
    return `## Tracking Discrepancy Diagnosis

### Common Causes

**1. Attribution Windows**
- Google Ads: Default 7-day click, 1-day view
- GA4: Default 3-day window
- Fix: Align windows

**2. Consent Mode Impact**
- Users declining consent = missing conversions
- Model impact in GA4

**3. Cross-Device Tracking**
- Mobile click → Desktop purchase = lost
- Fix: User-ID implementation

**4. Duplicate Tracking**
- Same event firing multiple times
- Fix: Event deduplication

**5. Data Delay**
- Google Ads: Up to 3 hours
- GA4: Real-time with sampling
- CRM: Varies

### Diagnosis Checklist
1. Compare date ranges
2. Check attribution windows
3. Verify consent coverage
4. Inspect event firing
5. Check for duplicates

### Target Thresholds
- <3%: Good
- 3-5%: Investigate
- >5%: Critical issue

What discrepancy would you like to investigate?`;
  }

  // Default
  return `I'm ${persona.name}, tracking & measurement specialist.

I help with:
- **GTM** — Container architecture, tag setup, triggers
- **GA4** — Event taxonomy, ecommerce, custom dimensions
- **Google Ads** — Conversion actions, enhanced conversions
- **Meta Pixel/CAPI** — Server-side, deduplication
- **Server-side tagging** — GTM SS, first-party data
- **Discrepancy diagnosis** — Cross-platform reconciliation
- **Consent mode** — GDPR, CCPA compliance

${context?.platform ? `Platform: **${context.platform}**` : ""}
${context?.issue ? `Issue: **${context.issue}**` : ""}

What tracking challenge would you like to solve?`;
}

export default router;
