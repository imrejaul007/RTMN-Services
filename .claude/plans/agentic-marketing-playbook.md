# Agentic Marketing Playbook — Communication & Engagement in the Autonomous Economy

> **Date:** 2026-06-22
>
> **Purpose:** Define how brands communicate with customers in the agentic economy — WhatsApp notifications, email, push, voice, and the AI agents that orchestrate them all.

---

## 0. Executive Summary

In the agentic economy, **marketing = communication orchestrated by AI agents**. The old model: brand pushes ads to interrupt users. The new model: **AI agent pulls the right message at the right moment through the user's preferred channel.**

The four big shifts:
1. **Channel-agnostic** — same message, right format, right channel (WhatsApp, email, push, voice, in-app)
2. **Permissioned** — customer controls what they receive, AI optimizes within those bounds
3. **Contextual** — message adapts to user's situation (location, time, mood, history)
4. **REZ-incentivized** — customers earn REZ for receiving relevant messages (attention is now compensated)

---

## 1. The Channels

| Channel | Best for | Format | Open rate |
|---|---|---|---|
| **WhatsApp** | Order updates, support, quick replies | Text, image, voice note | 98% |
| **Email** | Receipts, statements, detailed updates | HTML | 25% |
| **Push (mobile)** | Real-time alerts | Short text + image | 40% |
| **SMS** | Critical, time-sensitive | Plain text | 95% |
| **In-app** | Engagement, discovery | Rich UI | 60% |
| **Voice (Genie)** | Complex queries, accessibility | Voice | N/A |
| **Web push** | Re-engagement | Browser notification | 15% |
| **Razo Keyboard** | Ambient suggestions | Inline text | N/A |

---

## 2. The AI Marketing Agent (orchestrator)

The Marketing Agent is a SUTAR agent that **decides what to send, when, and through which channel**.

### Decision Tree

```
Should we send a message to this customer?
├─→ Customer opted out of this type? → No. Continue.
├─→ Is it the right time (timezone + preferences)? → No. Schedule for later.
├─→ Has customer been spammed recently (>5 msgs in 24h)? → Yes. Wait.
├─→ Is message relevant to this customer (relevance > 0.5)? → No. Skip.
├─→ Will message likely drive engagement (positive ROI)? → No. Skip.
└─→ Yes to all above!
    ├─→ Pick best channel (WhatsApp? email? push?)
    ├─→ Format message for channel
    ├─→ Send
    └─→ Track + credit REZ
```

---

## 3. Message Types

### Transactional (always sent)

| Type | Channel | Example |
|---|---|---|
| Order confirmation | WhatsApp + email | "✅ Order #12345 placed. Total ₹4,500. Earn ₹180 REZ." |
| Order shipped | WhatsApp | "📦 Order shipped! Tracking: [link]. Estimated delivery: Tue." |
| Out for delivery | WhatsApp + push | "🚚 Your order is out for delivery. Driver is 2 stops away." |
| Delivered | WhatsApp + email | "🎉 Delivered! Review + earn ₹50 REZ." |
| Refund processed | WhatsApp + email | "↩️ Refund of ₹1,200 processed." |
| Security alert | SMS + email | "🔒 New login from iPhone 15 in Mumbai." |

### Engagement (sent when relevant, opt-in)

| Type | Channel | Example |
|---|---|---|
| Back in stock | WhatsApp + push | "🔥 The Nike Pegasus 40 you wanted is back! ₹6,499. Earn ₹260 REZ." |
| Price drop | WhatsApp + push | "💰 Price drop! iPhone 15 now ₹65,000 (was ₹69,000)." |
| Personalized recommendation | In-app + push | "👟 Based on your running, we recommend Asics Gel-Nimbus 25." |
| Cart abandonment | WhatsApp + push | "🛒 Your cart has the Sony WH-1000XM5. Earn ₹200 REZ if you buy now." |
| Win-back | WhatsApp | "👋 We miss you! 500 REZ (₹500) credit if you shop this week." |
| Birthday | WhatsApp + push | "🎂 Happy birthday! ₹500 REZ gift in your wallet." |

### Marketing (low frequency, opt-in)

| Type | Channel | Example |
|---|---|---|
| New product launch | WhatsApp + email | "🚀 New from Nike! Air Max 2026 launches tomorrow." |
| Brand story | Email | "📖 The story behind your favorite brand..." |
| Flash sale | WhatsApp + push | "⚡ Flash sale! 4 hours only. Extra 10% REZ." |

---

## 4. WhatsApp as the Primary Channel

### Why WhatsApp Wins
- 98% open rate (vs email 25%)
- <3 minutes read time (vs email hours)
- Trust (personal channel)
- Rich media support
- 2B+ users worldwide

### WhatsApp Message Templates (approved by Meta)
- `order_confirmation`, `order_shipped`, `out_for_delivery`, `delivered`
- `payment_received`, `back_in_stock`, `price_drop`
- `cart_abandonment`, `review_request`, `win_back`
- `referral_bonus`, `festival_offer`

---

## 5. The Notification Decision Engine

### Channel Selection Logic

```typescript
function pickChannel(customer, message) {
  // 1. Customer's explicit preference (if set)
  if (customer.preferredChannel?.[message.type]) {
    return customer.preferredChannel[message.type];
  }
  
  // 2. Message type defaults
  if (message.type === 'order_confirmation') {
    return customer.hasWhatsApp ? 'whatsapp' : 'email';
  }
  if (message.type === 'security_alert') return 'sms';
  if (message.type === 'cart_abandonment') return 'push';
  
  // 3. Customer's engagement history
  return customer.bestPerformingChannel ?? (customer.hasWhatsApp ? 'whatsapp' : 'email');
}
```

---

## 6. REZ-Incentivized Attention

**Customers earn REZ for engaging with messages:**
- Open message: ₹2 REZ
- Click CTA: ₹5 REZ
- Review product: ₹50 REZ
- Refer friend: ₹100 REZ
- **Daily cap:** ₹50 REZ/day (prevents gaming)

**Brand's effective CAC: ~6%** (vs 25-40% in old model)

---

## 7. The New Funnel (Agentic)

```
Old: 1M impressions → 10K clicks (1% CTR) → 500 purchases → CAC ₹2,000
New: 10K personalized recommendations → 2,000 clicks (20% CTR) → 400 purchases → CAC ₹250

CAC reduction: 87.5%. Savings → REZ for customer.
```

---

## 8. Anti-Spam Guarantees (hard-coded)

1. Max 5 marketing messages/day per customer
2. Max 10/week
3. No 9pm-9am messages
4. No duplicates across channels
5. 7-day cooldown after opt-out
6. No messages to disengaged customers

---

## 9. Real-Time Engagement Tracking

```
Message sent → WhatsApp API confirms delivery → log "delivered"
   ↓
Customer opens → log "seen" (within 30s)
   ↓
Customer clicks CTA → log "clicked"
   ↓
Customer lands on product page → log "viewed"
   ↓
Customer adds to cart → log "carted"
   ↓
Customer completes purchase → log "purchased"
   ↓
Attribution: this purchase came from this message
   ↓
ACS updated + customer earns REZ
```

---

## 10. Implementation Roadmap

| Phase | Months | What ships |
|---|---|---|
| **MVP** | 1-3 | WhatsApp + email; transactional only; 5 brands |
| **Engagement** | 4-6 | Push + SMS; back-in-stock, cart abandon, win-back; 50 brands |
| **Personalization** | 7-9 | AI composer; TwinOS integration; voice AI; 500 brands |
| **Scale** | 10-12 | Razo Keyboard; cross-brand; 5,000 brands |

---

*This playbook is the operationalization of "agentic marketing" in the RTMN ecosystem. Last updated: 2026-06-22.*
