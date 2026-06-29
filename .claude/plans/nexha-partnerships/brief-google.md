# Partnership Brief: Google (Gemini + Workspace + Maps)

**Audience:** Google AI Partnerships, Google Cloud, Workspace Product Team
**Goal:** Integrate Nexha with Gemini, Workspace, and Maps for SME commerce
**Date:** 2026-06-29

---

## TL;DR

Google has the **search + maps + productivity + AI** stack for SMBs. Nexha has the **commerce infrastructure** — suppliers, payments, contracts, logistics.

Together: **the AI-enabled SMB commerce platform Google never built.**

## Why Google Needs Nexha

Google has built:
- ✅ Gemini (LLM)
- ✅ Workspace (Docs, Sheets, Gmail)
- ✅ Maps / Places
- ✅ Cloud (compute)
- ✅ YouTube (marketing)
- ✅ Search (discovery)

Google has **NOT** built:
- ❌ Merchant-to-merchant commerce network
- ❌ AI-to-AI B2B procurement
- ❌ Escrow payment rails for SMBs
- ❌ Trust scoring for global suppliers
- ❌ Cross-border contract automation

Nexha fills all of these.

## Three Integration Plays

### 1. Gemini + Nexha MCP

We've built a Gemini-compatible adapter (`@nexha/gemini`) and MCP server. Vertex AI customers can add Nexha as a tool:

```typescript
const model = vertexai.getGenerativeModel({
  model: "gemini-1.5-pro",
  tools: [createNexhaGeminiTools({ apiKey: "nx_xxx" })]
});

await model.generateContent("Find a hotel linen supplier in Bangalore");
```

**Asks:**
- Featured Gemini tool adapter
- Joint marketing to Vertex AI customers
- Listing in Vertex AI Model Garden

### 2. Workspace + CorpID

Every Google Workspace user has a Google account. Every Nexha entity has a CorpID. Connect them:

```
Google Workspace User → CorpID → Nexha Organization
```

This lets Workspace users:
- Sign Nexha contracts with their Google account
- Receive Nexha transaction alerts in Gmail
- View Nexha spend in Google Sheets (custom integration)

**Asks:**
- OAuth integration with Google Sign-In
- Gmail Add-on for Nexha notifications
- Sheets Add-on for Nexha analytics

### 3. Google Maps + Nexha Discovery

Google Maps knows every restaurant, store, and supplier location. Nexha knows their trust scores and trade history. Together:

```
Nexha Search: "Hotel suppliers in Dubai"
   → Nexha returns suppliers + trust scores + prices
   → Google Maps shows them on a map with ratings + directions
```

**Asks:**
- Place data integration with Nexha trust scores
- Maps display of verified Nexha suppliers
- Local Guides program promotion of Nexha suppliers

## Specific Use Cases

| Persona | Use Case |
|---------|----------|
| **Restaurant owner** | "Source sustainable seafood suppliers near me, compare prices, schedule recurring orders" |
| **Boutique hotel GM** | "Find linen suppliers in my city, check reviews, sign contract, auto-pay" |
| **Retail SMB** | "Compare Shopify suppliers, negotiate, integrate with my online store" |
| **Logistics dispatcher** | "Find the best carrier for this route, book, track, bill" |

## Why Google Will Say Yes

### Distribution
- 3 billion+ Workspace users
- 1 billion+ Maps users
- Vertex AI is Google's fastest-growing enterprise product

### Revenue
- $100B+ B2B commerce market unlocked for Workspace
- New Vertex AI tools = more enterprise spend
- Maps integration = more local business data

### Strategic
- Defend against Amazon Business, Alibaba, Coupang
- AI moat for Workspace
- Foundation model distribution via Vertex AI

## Competitive Landscape

| Alternative | Why Nexha Wins |
|------------|----------------|
| **Google build it themselves** | 18+ months of work, they're stretched thin |
| **Amazon Business** | Locked to AWS, poor international support |
| **Alibaba.com** | China-centric, weak trust scoring |
| **Coupang** | Korea-only |
| **Custom ERP integration** | Months of dev work, brittle |

**Nexha is the only vendor-neutral, foundation-governed, MCP-native choice.**

## Specific Asks

### Tier 1 (Quick Wins)
- ✅ **OAuth integration** with Google Sign-In (1 sprint)
- ✅ **Featured MCP server** in Gemini directory
- ✅ **Joint blog post** on AI-enabled SMB commerce

### Tier 2 (Medium Lift)
- 🔧 **Workspace Add-on** for Gmail notifications
- 🔧 **Vertex AI Model Garden listing**
- 🔧 **Maps Place data integration**

### Tier 3 (Strategic)
- 🤝 **Google Cloud Marketplace listing**
- 🤝 **Google takes Platinum seat** on Global Nexha Foundation Board
- 🤝 **Co-investment** in Foundation

## Pricing

**Google Cloud customers:**
- Free tier: 1,000 calls/month
- Standard: $0.01 per commerce call
- Enterprise: Custom

**Revenue share:** 5% of commerce flow via Google integrations.

## Live Demo (5 minutes)

1. Open Gemini API
2. Add Nexha tool
3. Ask: "I'm opening a new restaurant in Mumbai. Source 5 verified suppliers for kitchen equipment, check their trust, draft POs"
4. Watch Gemini call Nexha, return real suppliers with trust scores, generate purchase orders

## Risk: Google's Internal Politics

Google has 6+ teams that could partner:
- Cloud / Vertex AI
- Workspace
- Maps
- Search
- YouTube (creator commerce)
- Pixel/Android (on-device AI)

**Recommendation:** Lead with **Cloud + Workspace** — clearest champions, fastest decision.

## Ask: 30-Minute Intro Call

**Who:** Google AI Partnerships lead + 1 Workspace PM + 1 Cloud PM

**What we bring:**
- Live demo (5 min)
- 5 customer references
- Technical architecture
- Pricing model
- Joint roadmap proposal

**Contact:** partners@nexha.io

---

*See also: brief-openai.md, brief-anthropic.md, brief-meta.md, brief-shopify.md, brief-sap.md*